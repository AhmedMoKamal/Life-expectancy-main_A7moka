from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import pandas as pd
import custom_transformers
import __main__

for name in dir(custom_transformers):
    if not name.startswith('_'):
        setattr(__main__, name, getattr(custom_transformers, name))

app = FastAPI(title="Life Expectancy Prediction API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

with open('life_expectancy.sav', 'rb') as f:
    loaded_model = pickle.load(f)
model = loaded_model['pipeline']

class LifeExpectancyInput(BaseModel):
    Survey_Year: float
    Mortality_Adults: float
    Infant_Deaths_Count: float
    Alcohol_Consumption_Rate: float
    Hepatitis_B_Vaccination_Coverage: float
    Measles_Infection_Count: float
    Body_Mass_Index_Avg: float
    Polio_Vaccination_Coverage: float
    Total_Health_Expenditure: float
    Diphtheria_Vaccination_Coverage: float
    HIV_AIDS_Prevalence_Rate: float
    Gross_Domestic_Product: float
    Total_Population: float
    Thinness: float
    Nation: str
    Country_Category: str

@app.get("/")
def read_root():
    return {"message": "Welcome to the Life Expectancy API! 🚀"}

@app.post("/predict")
def predict_life_expectancy(data: LifeExpectancyInput):
    input_dict = data.dict()
    input_data_for_df = {key: [value] for key, value in input_dict.items()}
    new_data = pd.DataFrame(input_data_for_df)
    prediction_result = model.predict(new_data)
    return {"predicted_life_expectancy": round(prediction_result[0], 2)}



@app.get("/api/data")
def get_explore_data():
    try: 
        df = pd.read_csv("IEEE.csv")
        
        df.columns = df.columns.str.strip()
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
        
        df = df.fillna(0)
        
        return df.to_dict(orient="records")
    except Exception as e:
        return {"error": str(e)}