"""Multimodal Explainable AI (XAI) Suite: SHAP & LIME.

Provides game-theoretic Shapley value attributions (SHAP) and local surrogate
linear explanations (LIME) for multimodal deepfake scam predictions, explaining
precisely why a video was classified as HIGH_RISK, MEDIUM_RISK, or LOW_RISK.
"""

from typing import Dict, Any, List, Optional
import numpy as np

try:
    import shap
    HAS_SHAP = True
except (ImportError, ModuleNotFoundError):
    HAS_SHAP = False

try:
    import lime
    import lime.lime_tabular
    HAS_LIME = True
except (ImportError, ModuleNotFoundError):
    HAS_LIME = False

try:
    from src.utils import setup_logger
except (ImportError, ModuleNotFoundError):
    from .utils import setup_logger

try:
    from src.gradcam import GradCAMExplainer
except (ImportError, ModuleNotFoundError):
    from .gradcam import GradCAMExplainer


def format_timestamp(seconds: float) -> str:
    """Formats seconds to MM:SS.SS."""
    mins = int(seconds // 60)
    secs = seconds % 60
    return f"{mins:02d}:{secs:05.2f}"


def build_suspicious_temporal_timeline(frame_scores: List[float], timestamps: List[float]) -> List[Dict[str, Any]]:
    """Builds timeline of frame anomalies."""
    timeline = []
    for idx, (s, ts) in enumerate(zip(frame_scores, timestamps)):
        timeline.append({
            "frame_index": idx,
            "timestamp": format_timestamp(ts),
            "timestamp_seconds": round(float(ts), 3),
            "fake_probability": round(float(s), 4),
            "is_suspicious": bool(s >= 0.5)
        })
    return timeline

logger = setup_logger(__name__)

FEATURE_NAMES = [
    "visual_face_anomaly",
    "temporal_gru_inconsistency",
    "lip_sync_mismatch",
    "synthetic_voice_artifacts",
    "speech_scam_intent",
    "ocr_on_screen_scam",
    "vip_impersonation_risk",
    "unauthorized_branding_risk"
]


class MultimodalExplainer:
    """Computes SHAP and LIME explanations for the multimodal fusion risk prediction."""

    def __init__(self, fusion_model_fn=None):
        """
        Args:
            fusion_model_fn: Callable taking (N, 8) numpy array and returning (N,) or (N, 2) probabilities.
        """
        self.fusion_model_fn = fusion_model_fn or self._default_predict_fn
        self.feature_names = FEATURE_NAMES
        self.background_dataset = self._create_background_dataset()

        self._lime_explainer = None
        self._shap_explainer = None
        self._init_explainers()

    def _default_predict_fn(self, X: np.ndarray) -> np.ndarray:
        """Default probability prediction matching MultimodalRiskFusion weighting."""
        X = np.atleast_2d(X)
        weights = np.array([0.22, 0.22, 0.10, 0.11, 0.12, 0.08, 0.08, 0.07])
        scores = np.dot(X, weights)
        scores = np.clip(scores, 0.01, 0.99)
        # Return 2D probability array for [P(real), P(fake)]
        p_fake = scores.reshape(-1, 1)
        p_real = 1.0 - p_fake
        return np.hstack([p_real, p_fake])

    def _create_background_dataset(self) -> np.ndarray:
        """Creates reference baseline dataset for Shapley values."""
        # 30 synthetic baseline samples representing real, ambiguous, and scam scenarios
        rng = np.random.RandomState(42)
        base = rng.uniform(0.05, 0.35, size=(30, 8))
        return base.astype(np.float32)

    def _init_explainers(self):
        """Initializes LIME Tabular and SHAP Kernel explainers."""
        if HAS_LIME:
            try:
                self._lime_explainer = lime.lime_tabular.LimeTabularExplainer(
                    training_data=self.background_dataset,
                    feature_names=self.feature_names,
                    class_names=["Real / Safe", "Deepfake / Scam"],
                    mode="classification",
                    random_state=42
                )
                logger.info("LIME Tabular Explainer initialized.")
            except Exception as e:
                logger.warning("Could not initialize LIME explainer: %s", str(e))

        if HAS_SHAP:
            try:
                # KernelExplainer wrapped around fusion prediction function
                def model_prob_fake(data):
                    return self.fusion_model_fn(data)[:, 1]

                # Use medoid or mean background for fast evaluation
                summary_bg = shap.sample(self.background_dataset, 5)
                self._shap_explainer = shap.KernelExplainer(model_prob_fake, summary_bg)
                logger.info("SHAP KernelExplainer initialized.")
            except Exception as e:
                logger.warning("Could not initialize SHAP explainer: %s", str(e))

    def explain(self, features_dict: Dict[str, float]) -> Dict[str, Any]:
        """
        Generates both SHAP and LIME attributions for an input feature vector.

        Args:
            features_dict: Dict with keys matching forensic features.
        Returns:
            Dict containing SHAP values, LIME local weights, and top risk drivers.
        """
        # Convert dictionary to ordered feature vector
        vector = np.array([
            features_dict.get("visual_score", 0.0),
            features_dict.get("temporal_score", 0.0),
            features_dict.get("lip_sync_score", 0.5),
            features_dict.get("synthetic_voice_score", 0.5),
            features_dict.get("scam_text_score", 0.0),
            features_dict.get("ocr_scam_score", 0.0),
            features_dict.get("identity_impersonation_score", 0.0),
            features_dict.get("branding_risk_score", 0.0)
        ], dtype=np.float32)

        shap_res = self._compute_shap(vector)
        lime_res = self._compute_lime(vector)

        # Rank most influential features
        combined_ranking = self._rank_features(shap_res["attributions"], lime_res["local_weights"])

        return {
            "shap": shap_res,
            "lime": lime_res,
            "top_risk_drivers": combined_ranking,
            "summary": self._generate_summary(combined_ranking)
        }

    def _compute_shap(self, vector: np.ndarray) -> Dict[str, Any]:
        """Computes exact or analytical Shapley values."""
        attributions = {}
        base_value = 0.20

        if self._shap_explainer is not None:
            try:
                # Calculate SHAP values
                shap_vals = self._shap_explainer.shap_values(vector.reshape(1, -1), nsamples=30)
                if isinstance(shap_vals, list):
                    vals = np.array(shap_vals[0]).flatten()
                elif isinstance(shap_vals, np.ndarray):
                    vals = shap_vals.flatten()
                else:
                    vals = np.array(shap_vals).flatten()

                base_value = float(self._shap_explainer.expected_value)
                for name, val in zip(self.feature_names, vals):
                    attributions[name] = round(float(val), 4)

                return {
                    "base_value": round(base_value, 4),
                    "attributions": attributions,
                    "method": "KernelSHAP"
                }
            except Exception as e:
                logger.debug("SHAP evaluation notice: %s. Using closed-form linear Shapley values.", str(e))

        # Closed-form Shapley values for linear weighted utility: phi_i = w_i * (x_i - baseline_i)
        weights = [0.22, 0.22, 0.10, 0.11, 0.12, 0.08, 0.08, 0.07]
        baselines = np.mean(self.background_dataset, axis=0)
        base_value = float(np.dot(baselines, weights))

        for name, w, x, b in zip(self.feature_names, weights, vector, baselines):
            phi = float(w * (x - b))
            attributions[name] = round(phi, 4)

        return {
            "base_value": round(base_value, 4),
            "attributions": attributions,
            "method": "LinearShapley"
        }

    def _compute_lime(self, vector: np.ndarray) -> Dict[str, Any]:
        """Computes LIME local surrogate weights."""
        local_weights = {}
        intercept = 0.5

        if self._lime_explainer is not None:
            try:
                exp = self._lime_explainer.explain_instance(
                    data_row=vector,
                    predict_fn=self.fusion_model_fn,
                    num_features=8,
                    labels=[1]
                )
                for feat_tuple in exp.as_list(label=1):
                    rule_or_name, weight = feat_tuple
                    # Extract cleanest key
                    matched_key = rule_or_name
                    for fn in self.feature_names:
                        if fn in rule_or_name:
                            matched_key = fn
                            break
                    local_weights[matched_key] = round(float(weight), 4)

                return {
                    "local_weights": local_weights,
                    "intercept": round(float(exp.intercept[1]), 4) if hasattr(exp, "intercept") else 0.5,
                    "method": "LIME_Tabular"
                }
            except Exception as e:
                logger.debug("LIME evaluation notice: %s. Using surrogate neighborhood approximation.", str(e))

        # Local Taylor-expansion surrogate linear weights
        weights = [0.22, 0.22, 0.10, 0.11, 0.12, 0.08, 0.08, 0.07]
        for name, w, val in zip(self.feature_names, weights, vector):
            local_weights[name] = round(float(w * val), 4)

        return {
            "local_weights": local_weights,
            "intercept": 0.05,
            "method": "SurrogateLocalWeights"
        }

    def _rank_features(self, shap_dict: Dict[str, float], lime_dict: Dict[str, float]) -> List[Dict[str, Any]]:
        """Ranks modalities by magnitude of influence toward the final decision."""
        ranking = []
        for name in self.feature_names:
            s_val = shap_dict.get(name, 0.0)
            l_val = lime_dict.get(name, 0.0)
            avg_importance = (abs(s_val) + abs(l_val)) / 2.0
            direction = "INCREASES_RISK" if s_val >= 0 else "REDUCES_RISK"

            ranking.append({
                "modality": name,
                "importance": round(avg_importance, 4),
                "shap_value": s_val,
                "lime_weight": l_val,
                "impact": direction
            })

        ranking.sort(key=lambda item: item["importance"], reverse=True)
        return ranking

    def _generate_summary(self, top_drivers: List[Dict[str, Any]]) -> str:
        """Generates natural language explainability brief."""
        if not top_drivers:
            return "No dominant modal drivers identified."

        top = top_drivers[0]
        second = top_drivers[1] if len(top_drivers) > 1 else None

        summary = f"Primary decision driver is '{top['modality']}' (SHAP={top['shap_value']:+.3f}, {top['impact']})"
        if second and second["importance"] > 0.03:
            summary += f", followed by '{second['modality']}' (SHAP={second['shap_value']:+.3f})."
        else:
            summary += "."
        return summary
