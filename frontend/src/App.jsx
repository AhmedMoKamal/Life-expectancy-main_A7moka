import logoImg from './assets/logo.png'
import careImg from './assets/care.jpeg'
import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import './App.css'

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json"

// Dictionary linking map names 
const countryNameMapping = {
  "Russia": "Russian Federation",
  "Iran": "Iran (Islamic Republic of)",
  "Syria": "Syrian Arab Republic",
  "United States": "United States of America",
  "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
  "Venezuela": "Venezuela (Bolivarian Republic of)",
  "Bolivia": "Bolivia (Plurinational State of)",
  "Vietnam": "Viet Nam",
  "South Korea": "Republic of Korea",
  "North Korea": "Democratic People's Republic of Korea",
  "Moldova": "Republic of Moldova",
  "Tanzania": "United Republic of Tanzania",
  "Laos": "Lao People's Democratic Republic",
  "Palestine": "State of Palestine",
  "Ivory Coast": "Côte d'Ivoire",
  "Democratic Republic of Congo": "Democratic Republic of the Congo",
  "Republic of Congo": "Congo"
};

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [allData, setAllData] = useState([])
  const [filteredData, setFilteredData] = useState([])

  const [analysisOption, setAnalysisOption] = useState('Overall Data Over All Years')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedFeature, setSelectedFeature] = useState('Mortality_Adults')

  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 })

  const [formData, setFormData] = useState({
    Survey_Year: 2006, Mortality_Adults: 123, Infant_Deaths_Count: 8,
    Alcohol_Consumption_Rate: 0.97, Hepatitis_B_Vaccination_Coverage: 83,
    Measles_Infection_Count: 517, Body_Mass_Index_Avg: 48.5,
    Polio_Vaccination_Coverage: 83, Total_Health_Expenditure: 3.78,
    Diphtheria_Vaccination_Coverage: 8, HIV_AIDS_Prevalence_Rate: 0.1,
    Gross_Domestic_Product: 1762.24, Total_Population: 18914977,
    Thinness: 6.4, Nation: 'United Arab Emirates', Country_Category: 'Developing'
  })
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)

  const featuresList = [
    'Mortality_Adults', 'Infant_Deaths_Count', 'Alcohol_Consumption_Rate',
    'Hepatitis_B_Vaccination_Coverage', 'Measles_Infection_Count', 'Body_Mass_Index_Avg',
    'Polio_Vaccination_Coverage', 'Total_Health_Expenditure', 'Diphtheria_Vaccination_Coverage',
    'HIV_AIDS_Prevalence_Rate', 'Gross_Domestic_Product', 'Total_Population', 'Thinness'
  ]

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/data')
      .then(res => res.json())
      .then(data => {
        setAllData(data)
        setFilteredData(data)
        if (data.length > 0) {
          setSelectedCountry(data[0].Nation)
          setSelectedYear(data[0].Survey_Year)
        }
      })
      .catch(err => console.error("Error fetching CSV data:", err))
  }, [])

  useEffect(() => {
    let temp = [...allData]
    if (analysisOption === 'Specific Country Over All Years') {
      temp = temp.filter(d => d.Nation === selectedCountry)
    } else if (analysisOption === 'Specific Country Within a Specific Year') {
      temp = temp.filter(d => d.Nation === selectedCountry && d.Survey_Year === parseInt(selectedYear))
    }
    setFilteredData(temp)
  }, [analysisOption, selectedCountry, selectedYear, allData])

  const handleCountryClick = (mapCountryName) => {
    if (!mapCountryName) return;

    //Use the dictionary to look up the name if it exists; if not, use the name as is.
    const datasetCountryName = countryNameMapping[mapCountryName] || mapCountryName;

    if (selectedCountry === datasetCountryName) {
      setSelectedCountry('');
      setAnalysisOption('Overall Data Over All Years');
      return;
    }

    const exists = allData.some(d => d.Nation === datasetCountryName);
    if (exists) {
      setSelectedCountry(datasetCountryName);
      setAnalysisOption('Specific Country Over All Years');
    } else {
      alert(`No data available in our dataset for ${datasetCountryName}`);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const parsedValue = (name === 'Nation' || name === 'Country_Category') ? value : parseFloat(value) || 0;
    setFormData({ ...formData, [name]: parsedValue })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      setPrediction(data.predicted_life_expectancy)
    } catch (error) {
      alert("Please make sure your Python server is running.")
    }
    setLoading(false)
  }

  const pieData = [
    { name: 'Developing', value: filteredData.filter(d => d.Country_Category === 'Developing').length },
    { name: 'Developed', value: filteredData.filter(d => d.Country_Category === 'Developed').length }
  ]
  const COLORS = ['#5e0596', '#ffc505']

  const trendData = Object.values(filteredData.reduce((acc, d) => {
    if (!acc[d.Survey_Year]) acc[d.Survey_Year] = { year: d.Survey_Year, total: 0, count: 0 }
    acc[d.Survey_Year].total += d[selectedFeature]
    acc[d.Survey_Year].count += 1
    return acc
  }, {})).map(item => ({ year: item.year, value: +(item.total / item.count).toFixed(2) })).sort((a, b) => a.year - b.year)

  const barData = Object.values(filteredData.reduce((acc, d) => {
    if (!acc[d.Nation]) acc[d.Nation] = { Nation: d.Nation, total: 0, count: 0 }
    acc[d.Nation].total += d[selectedFeature]
    acc[d.Nation].count += 1
    return acc
  }, {})).map(item => ({ Nation: item.Nation, value: +(item.total / item.count).toFixed(2) })).sort((a, b) => b.value - a.value).slice(0, 10)

  const scatterData = filteredData.map(d => ({
    x: d[selectedFeature],
    y: d.Life_Expectancy_Years,
    name: d.Nation
  })).slice(0, 500)

  return (
    <div className="app-layout">
      {tooltip.show && (
        <div style={{
          position: 'fixed', top: tooltip.y + 15, left: tooltip.x + 15,
          background: '#1f2937', color: 'white', padding: '8px 12px',
          borderRadius: '8px', zIndex: 9999, pointerEvents: 'none',
          fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          {tooltip.content}
        </div>
      )}

      <div className="glass-panel">
        <aside className="sidebar">
          <div className="logo-container">
            <img src={logoImg} alt="LifeHub Logo" className="main-logo" />
          </div>
          <nav className="nav-menu">
            <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
              <span className="icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></span> Home
            </button>
            <button className={`nav-item ${activeTab === 'predict' ? 'active' : ''}`} onClick={() => setActiveTab('predict')}>
              <span className="icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></span> Prediction
            </button>
            <button className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
              <span className="icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></span> Dashboard
            </button>
          </nav>

          {activeTab === 'explore' && (
            <div className="sidebar-filters fade-in">
              <hr className="divider" />
              <h3>Filters</h3>
              <div className="filter-group">
                <label>Analysis Option</label>
                <select value={analysisOption} onChange={(e) => setAnalysisOption(e.target.value)}>
                  <option>Overall Data Over All Years</option>
                  <option>Specific Country Over All Years</option>
                  <option>Specific Country Within a Specific Year</option>
                </select>
              </div>

              {analysisOption !== 'Overall Data Over All Years' && (
                <div className="filter-group fade-in">
                  <label>Select Country</label>
                  <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                    {[...new Set(allData.map(d => d.Nation))].sort().map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {analysisOption === 'Specific Country Within a Specific Year' && (
                <div className="filter-group fade-in">
                  <label>Select Year</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    {[...new Set(allData.map(d => d.Survey_Year))].sort((a, b) => b - a).map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </aside>

        <main className="content-area">
          {activeTab === 'home' && (
            <div className="page fade-in">
              <div className="home-header">
                <p className="welcome-text">Welcome to</p>
                <h1>AI-Driven Life Expectancy Analysis</h1>
                <p className="subtitle">Discover insights and predict health outcomes based on global economic and health data.</p>
              </div>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="28" height="28" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></div>
                  <h3>Real-time AI Predictions</h3>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="28" height="28" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></div>
                  <h3>Interactive Data Exploration</h3>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="28" height="28" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                  <h3>Global Health Trends</h3>
                </div>
              </div>
              <div className="image-placeholder">
                <img src={careImg} alt="Healthcare Support" className="hero-image" />
              </div>
            </div>
          )}

          {activeTab === 'predict' && (
            <div className="page fade-in">
              <div className="page-header">
                <h1>Prediction Engine</h1>
                <p>Generate precise AI outcomes based on current metrics.</p>
              </div>
              <div className="card prediction-card">
                <form onSubmit={handleSubmit}>
                  <div className="grid-container">
                    {Object.keys(formData).map((key) => (
                      <div className="form-group" key={key}>
                        <label>{key.replace(/_/g, ' ')}</label>
                        {key === 'Country_Category' ? (
                          <select name={key} value={formData[key]} onChange={handleChange}>
                            <option value="Developing">Developing</option><option value="Developed">Developed</option>
                          </select>
                        ) : (<input type={key === 'Nation' ? 'text' : 'number'} step="any" name={key} value={formData[key]} onChange={handleChange} required />)}
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Calculating...' : 'Generate Prediction'}</button>
                </form>
                {prediction !== null && (
                  <div className="result-box fade-in"><p>Life Expectancy Result</p><h2>{prediction} <span>Years</span></h2></div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'explore' && (
            <div className="page fade-in">
              <div className="page-header">
                <h1>Life Expectancy Data Analysis</h1>
                <p>{analysisOption}</p>
                <div className="feature-selector-container card">
                  <label>Select a feature to visualize:</label>
                  <select value={selectedFeature} onChange={(e) => setSelectedFeature(e.target.value)}>
                    {featuresList.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="charts-grid-main">
                <div className="card chart-card">
                  <h3>Distribution of {selectedFeature.replace(/_/g, ' ')}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                  <h3>{selectedFeature.replace(/_/g, ' ')} Trend Over Years</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="value" stroke="#7914b8" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                  <h3>Top 10 Countries by {selectedFeature.replace(/_/g, ' ')}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barData}>
                      <XAxis dataKey="Nation" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#520596" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                  <h3>Correlation: {selectedFeature.replace(/_/g, ' ')} vs Life Expectancy</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <ScatterChart>
                      <XAxis type="number" dataKey="x" name={selectedFeature} axisLine={false} tickLine={false} />
                      <YAxis type="number" dataKey="y" name="Life Expectancy" axisLine={false} tickLine={false} />
                      <ZAxis range={[50, 50]} />
                      <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Data" data={scatterData} fill="#871fd6db" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card map-container" style={{ marginTop: '2rem', position: 'relative', overflow: 'hidden' }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#491767', fontSize: '1rem' }}>Global Map</h3>
                <ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 170 }}>
                  <ZoomableGroup zoom={1} maxZoom={5}>
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies ? geographies.map((geo) => {
                          const mapCountryName = geo?.properties?.name || "Unknown";
                          const datasetCountryName = countryNameMapping[mapCountryName] || mapCountryName;
                          const isSelected = selectedCountry === datasetCountryName;

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onMouseMove={(e) => {
                                if (mapCountryName !== "Unknown") {
                                  setTooltip({ show: true, content: datasetCountryName, x: e.clientX, y: e.clientY });
                                }
                              }}
                              onMouseLeave={() => setTooltip({ show: false, content: '', x: 0, y: 0 })}
                              onClick={() => handleCountryClick(mapCountryName)}
                              style={{
                                default: { fill: isSelected ? "#330067" : "#3b2b4392", outline: "none", stroke: "#FFFFFF", strokeWidth: 0.5 },
                                hover: { fill: "#ff6aee", outline: "none", cursor: "pointer" },
                                pressed: { fill: "#ff6aee", outline: "none" }
                              }}
                            />
                          );
                        }) : null
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
export default App