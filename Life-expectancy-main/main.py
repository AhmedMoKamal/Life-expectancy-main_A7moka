import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import pandas as pd
import custom_transformers
import __main__
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
gemini_model = genai.GenerativeModel("models/gemini-3.1-flash-lite-preview")

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

@app.get("/test-ai")
async def test_ai():
    response = gemini_model.generate_content("Explain what is the Gradient Descent in two lines")
    return {"gemini_response": response.text}

# --- Request Models ---
class ChatRequest(BaseModel):
    message: str

class ChartDataRequest(BaseModel):
    chart_title: str
    chart_data: str

# --- 1. Floating Chatbot Endpoint ---
@app.post("/api/chat")
async def chat_with_ai(req: ChatRequest):
    try:
        df = pd.read_csv("IEEE.csv")
        df.columns = df.columns.str.strip()
        
        country_col = next((c for c in df.columns if 'Nation' in c or 'Country' in c), df.columns[0])
        life_col = next((c for c in df.columns if 'Life' in c), df.columns[1])
        
        top_data = df.nlargest(5, life_col)[[country_col, life_col]].to_dict(orient='records')
        avg_life = round(df[life_col].mean(), 2)
        
        data_summary = f"Top 5 Countries: {top_data}. Global Average: {avg_life}."
    except Exception as e:
        print(f"Error reading CSV: {e}") 
        data_summary = "Data currently unavailable in the CSV."


    system_prompt = f"""You are the lead AI Health Expert at 'LifeHub'.
    
    DATA SOURCE (MUST USE):
    {data_summary}
    
    INSTRUCTIONS:
    1. If the user asks for top countries, list the ones from the 'DATA SOURCE' above. 
    2. Do NOT say 'I don't have data'. You HAVE the data provided above.
    3. Use your medical knowledge to explain WHY these countries are top (e.g., diet, healthcare).
    4. Format your response beautifully with Markdown (bold, lists, emojis).
    5. Always answer in the same language as the user.
    
    User Query: """
    
    full_prompt = system_prompt + req.message
    
    try:
        response = await gemini_model.generate_content_async(full_prompt)
        return {"reply": response.text}
    except Exception as e:
        return {"reply": "Wow! My AI brain is currently overwhelmed by traffic. 🚀 Try again in a moment!"}

@app.post("/api/analyze-chart")
async def analyze_chart(req: ChartDataRequest):

    prompt = f"""You are an expert AI Data Analyst.
    
    Context: {req.chart_title}
    Data: {req.chart_data}
    
    Task:
    1. Analyze the data accurately.
    2. If the data is very small (e.g., a single value for one country), DO NOT force 3 points. Just give a brief, insightful explanation of what this single value means.
    3. If the data is large or a trend, provide 2-3 advisory points.
    4. Keep it brief, professional, use emojis, and bold text.
    """
    
    try:
        response = await gemini_model.generate_content_async(prompt)
        
        
        if not response.text:
            return {"analysis": "🤖 The AI couldn't generate a deep analysis from this single data point. Try expanding the data."}
            
        return {"analysis": response.text}
        
    except Exception as e:
        error_msg = str(e).lower()
        print(f"⚠️ Real Error: {error_msg}") 
        
      
        if "429" in error_msg or "exhausted" in error_msg or "quota" in error_msg:
            return {"analysis": "⏳ Burst Limit Reached! Please click 'Analyze' on one chart at a time and wait a few seconds."}
        elif "valueerror" in error_msg or "extract text" in error_msg:
            return {"analysis": "🤖 The AI got confused by this specific data. Please try another chart."}
        else:
            return {"analysis": f"❌ Error: {str(e)}"}