import pandas as pd
import numpy as np
import random
import uuid

def generate_kenya_health_claims(num_samples: int = 50000, output_path: str = "dataset.csv"):
    np.random.seed(42)
    random.seed(42)

    facilities = [f"FAC-{i:04d}" for i in range(1, 101)]
    patients = [f"PAT-{i:05d}" for i in range(1, 5001)]
    
    # Common Kenyan ICD-10 codes: Malaria, Respiratory, Maternal, Trauma
    icd10_codes = ["B50.9", "J06.9", "O80.0", "S00.9", "A09", "Z00.0", "E11.9", "I10"]

    data = {
        "claim_amount": [],
        "facility_id": [],
        "patient_id": [],
        "icd10_code": [],
        "time_of_day": [],
        "days_since_last_claim": [],
        "geographic_distance_km": [],
        "is_fraud": [] # Target variable
    }

    for _ in range(num_samples):
        # Base realistic distributions
        facility = random.choice(facilities)
        patient = random.choice(patients)
        icd10 = random.choice(icd10_codes)
        
        # Most claims happen during standard hours 8:00 - 18:00
        time_of_day = round(np.random.normal(13, 3), 1)
        time_of_day = max(0.0, min(23.9, time_of_day))
        
        # Days since last claim - typically log-normal
        days_since = int(np.random.lognormal(mean=4.0, sigma=1.0))
        
        # Distance - mostly local, occasional long-distance
        distance = round(np.random.exponential(scale=15), 1)
        
        # Base claim amount based on ICD-10 roughly
        if icd10 in ["B50.9", "J06.9", "A09"]: # Common out-patient (Malaria, RTIs)
            base_amount = np.random.normal(1500, 500)
        elif icd10 in ["O80.0", "S00.9"]: # Maternal, Trauma
            base_amount = np.random.normal(15000, 5000)
        else:
            base_amount = np.random.normal(5000, 2000)
            
        amount = max(500.0, round(base_amount, 2))
        
        # Fraud probability logic (Synthetic Rules)
        is_fraud = 0
        fraud_prob = 0.02 # 2% base fraud rate
        
        if amount > 50000:
            fraud_prob += 0.3
        if time_of_day < 5 or time_of_day > 22:
            fraud_prob += 0.15
        if distance > 100:
            fraud_prob += 0.1
        if days_since < 3:
            fraud_prob += 0.2
            
        # Correlated fraud scenarios
        if amount > 20000 and icd10 in ["B50.9", "J06.9"]: # Unreasonably high for basic outpatient
            fraud_prob += 0.6
            
        if random.random() < fraud_prob:
            is_fraud = 1
            
        data["claim_amount"].append(amount)
        data["facility_id"].append(facility)
        data["patient_id"].append(patient)
        data["icd10_code"].append(icd10)
        data["time_of_day"].append(time_of_day)
        data["days_since_last_claim"].append(days_since)
        data["geographic_distance_km"].append(distance)
        data["is_fraud"].append(is_fraud)

    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    
    print(f"Generated {num_samples} records.")
    print(f"Fraud distribution:\n{df['is_fraud'].value_counts(normalize=True)}")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    generate_kenya_health_claims()
