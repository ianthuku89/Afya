import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, roc_auc_score
import joblib

def train_and_export_model(dataset_path: str = "dataset.csv", artifact_path: str = "fraud_model.joblib"):
    print(f"Loading dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)

    # Encode categorical variables
    print("Encoding categorical features...")
    encoders = {}
    for col in ["facility_id", "patient_id", "icd10_code"]:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
        
    # Separate features and target
    X = df.drop("is_fraud", axis=1)
    y = df["is_fraud"]

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Initialize XGBoost Classifier targeting probability outputs
    print("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        objective="binary:logistic",
        random_state=42,
        eval_metric="auc"
    )

    model.fit(X_train, y_train)

    # Evaluation
    print("Evaluating model...")
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # We care about the 0.40 threshold mentioned in requirements
    y_pred_40 = (y_pred_proba >= 0.40).astype(int)
    
    print("\nClassification Report (Threshold = 0.40):")
    print(classification_report(y_test, y_pred_40))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, y_pred_proba):.4f}")

    # Exporting artifacts
    print(f"Exporting model artifact to {artifact_path}...")
    
    artifact = {
        "model": model,
        "encoders": encoders,
        "features": list(X.columns)
    }
    joblib.dump(artifact, artifact_path)
    print("Successfully exported bundle.")

if __name__ == "__main__":
    train_and_export_model()
