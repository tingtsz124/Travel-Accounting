'use client';
import { useState, useEffect, useMemo } from 'react';

// ⚠️ 請將下方網址替換為你在 Google Apps Script 取得的部署網址
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPylNFwH94mMWD0PEhxVzCVQkIffukv28r5GcxosiBvDdcQrZRlVSnWsv-yFrUvnaHvQ/exec';

const CURRENCIES = ['HKD', 'MOP', 'KRW', 'JPY', 'TWD', 'RMB', 'MYR', 'SGD'];

// 帶有專屬小 Icon 的類別
const CATEGORIES_WITH_ICONS = [
  { name: '未分類', icon: '🏷️' },
  { name: 'Share', icon: '🤝' },
  { name: 'wiki', icon: '🛍️' },
  { name: '機票', icon: '✈️' },
  { name: '酒店', icon: '🏨' },
  { name: '飲食', icon: '🍽️' },
  { name: '衣物', icon: '👕' },
  { name: '手信', icon: '🎁' },
  { name: '退稅', icon: '💵' },
  { name: '演唱會', icon: '🎤' },
  { name: '交通', icon: '🚖' },
  { name: '娛樂', icon: '🎡' },
  { name: '公仔/扭蛋', icon: '🧸' },
  { name: '團費', icon: '🎟️' },
  { name: '代購', icon: '📦' },
  { name: '雜項', icon: '📎' },
  { name: 'ZB1', icon: '💎' },
  { name: '家', icon: '🏠' },
  { name: '門票', icon: '🎫' },
  { name: '日用品', icon: '🧴' },
  { name: '化妝品/飾物', icon: '💄' },
  { name: '文具', icon: '✏️' },
  { name: '禮物', icon: '🎀' }
];

const PAYMENT_METHODS = ['AE', 'MOX', '工商銀聯', '大西洋', '大豐', '工商', '中銀', '現金', 'Alipay HK', '渣打'];

// 木質大地色系配色庫 (圓餅圖用)
const WOOD_COLORS = [
  '#8c6d58', '#a67c52', '#c4a482', '#d2b48c', '#a0522d',
  '#b8860b', '#cd853f', '#d2a679', '#966f33', '#b38b6d'
];

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 動態預設匯率
  const [defaultRates, setDefaultRates] = useState({
    HKD: '1.0', MOP: '0.97', JPY: '0.051', KRW: '0.0058',
    TWD: '0.24', RMB: '1.09', MYR: '1.75', SGD: '5.85'
  });

  // 行程篩選與自訂旅程狀態
  const [filterTripDate, setFilterTripDate] = useState('ALL');
  const [isCustomTripDate, setIsCustomTripDate] = useState(false);
  const [customTripDate, setCustomTripDate] = useState('');

  // 多選類別 Filter 狀態 (預設空陣列代表全選)
  const [selectedCategories, setSelectedCategories] = useState([]);

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // 表單狀態
  const [form, setForm] = useState({
    item: '',
    currency: 'HKD',
    amount: '',
    exchangeRate: '1.0',
    category: '未分類',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '現金',
    note: '',
    destination: '',
    tripDate: ''
  });

  // 自動還原上次選項
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastCurrency = localStorage.getItem('last_currency');
      const lastPayment = localStorage.getItem('last_paymentMethod');
      const lastTripDate = localStorage.getItem('last_tripDate');
      const lastDate = localStorage.getItem('last_date');
      const lastFilterTripDate = localStorage.getItem('last_filterTripDate');

      setForm(prev => ({
        ...prev,
        currency: lastCurrency || prev.currency,
        paymentMethod: lastPayment || prev.paymentMethod,
        tripDate: lastTripDate || prev.tripDate,
        date: lastDate || prev.date,
        exchangeRate: lastCurrency ? (defaultRates[lastCurrency] || '1.0') : prev.exchangeRate
      }));

      if (lastFilterTripDate) {
        setFilterTripDate(lastFilterTripDate);
      }
    }
  }, [defaultRates]);

  const handleFilterTripDateChange = (selectedDate) => {
    setFilterTripDate(selectedDate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_filterTripDate', selectedDate);
    }
  };

  const uniqueTripDates = useMemo(() => {
    const dates = expenses.map(e => e.tripDate).filter(Boolean);
    return Array.from(new Set(dates));
  }, [expenses]);

  const fetchFromGoogleSheet = async () => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL') return;
    setIsLoading(true);
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setExpenses(data.reverse());
      } else if (data && data.expenses) {
        setExpenses(data.expenses.reverse());
        if (data.defaultRates) {
          setDefaultRates(data.defaultRates);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFromGoogleSheet();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTripDate, selectedCategories]);

  const handleCurrencyChange = (selectedCurrency) => {
    const defaultRate = defaultRates[selectedCurrency] || '1.0';
    setForm(prev => ({
      ...prev,
      currency: selectedCurrency,
      exchangeRate: defaultRate
    }));
  };

  const calculatedHKD = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const rate = parseFloat(form.exchangeRate) || 1;
    return (amt * rate).toFixed(2);
  }, [form.amount, form.exchangeRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item || !form.amount) return;

    const finalTripDate = isCustomTripDate ? customTripDate : form.tripDate;
    setIsSubmitting(true);

    const newExpense = {
      id: Date.now(),
      ...form,
      tripDate: finalTripDate,
      amountHKD: parseFloat(calculatedHKD)
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('last_currency', form.currency);
      localStorage.setItem('last_paymentMethod', form.paymentMethod);
      localStorage.setItem('last_tripDate', finalTripDate);
      localStorage.setItem('last_date', form.date);
    }

    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_URL') {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newExpense),
        });
        setTimeout(() => {
          fetchFromGoogleSheet();
        }, 1000);
      } catch (err) {
        console.error('Failed to sync to Google Sheet:', err);
      }
    }

    setForm(prev => ({
      ...prev,
      item: '',
      amount: '',
      category: '未分類',
      note: '',
      tripDate: finalTripDate
    }));

    if (isCustomTripDate) {
      setIsCustomTripDate(false);
      setCustomTripDate('');
    }

    setIsSubmitting(false);
  };

  // 格式化日期為 YYYY-MM-DD 以適應 input[type="date"]
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // 將 2027/2/28 或 2027/02/28 轉為 [2027, 2, 28]
    const parts = dateStr.replace(/-/g, '/').split('/');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  // 複製點擊項目的資料到新增表單
  const handleCopyExpenseToForm = (item) => {
    setForm(prev => ({
      ...prev,
      item: item.item || '',
      currency: item.currency || 'HKD',
      amount: item.amount ? String(item.amount) : '',
      exchangeRate: item.exchangeRate ? String(item.exchangeRate) : (defaultRates[item.currency] || '1.0'),
      category: item.category || '未分類',
      paymentMethod: item.paymentMethod || '現金',
      note: item.note || '',
      destination: item.destination || '',
      tripDate: item.tripDate || prev.tripDate,
      date: formatDateForInput(item.date)
    }));

    // 滾動畫面至上方表單
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 類別 Filter 切換邏輯
  const toggleCategoryFilter = (categoryName) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  // 依行程 Filter 的所有資料
  const filteredByTripExpenses = useMemo(() => {
    if (filterTripDate === 'ALL') return expenses;
    return expenses.filter(e => e.tripDate === filterTripDate);
  }, [expenses, filterTripDate]);

  // 依行程 + 類別 Filter 的最終明細資料
  const finalFilteredExpenses = useMemo(() => {
    if (selectedCategories.length === 0) return filteredByTripExpenses;
    return filteredByTripExpenses.filter(e => selectedCategories.includes(e.category));
  }, [filteredByTripExpenses, selectedCategories]);

  // 個人開支 (排除 wiki 和 代購)
  const personalExpenses = useMemo(() => {
    return filteredByTripExpenses.filter(e => e.category !== 'wiki' && e.category !== '代購');
  }, [filteredByTripExpenses]);

  const grandTotal = useMemo(() => {
    return personalExpenses.reduce((sum, e) => sum + (e.amountHKD || 0), 0);
  }, [personalExpenses]);

  // 獨立小計 (自身總和)
  const excludedItemsSummary = useMemo(() => {
    let wikiTotal = 0;
    let proxyTotal = 0;
    filteredByTripExpenses.forEach(e => {
      if (e.category === 'wiki') wikiTotal += (e.amountHKD || 0);
      if (e.category === '代購') proxyTotal += (e.amountHKD || 0);
    });
    return { wikiTotal, proxyTotal };
  }, [filteredByTripExpenses]);

  const categoryData = useMemo(() => {
    const map = {};
    personalExpenses.forEach(e => {
      const cat = e.category || '未分類';
      map[cat] = (map[cat] || 0) + (e.amountHKD || 0);
    });

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percent: grandTotal > 0 ? (value / grandTotal) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [personalExpenses, grandTotal]);

  const totalPages = Math.max(1, Math.ceil(finalFilteredExpenses.length / itemsPerPage));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalFilteredExpenses.slice(start, start + itemsPerPage);
  }, [finalFilteredExpenses, currentPage]);

  const renderPieChart = () => {
    if (grandTotal === 0 || categoryData.length === 0) {
      return <p style={{ color: '#a39281', textAlign: 'center', margin: '20px 0', fontSize: '13px' }}>尚無消費數據</p>;
    }

    let cumulativePercent = 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '140px', height: '140px', borderRadius: '50%' }}>
          {categoryData.map((slice, i) => {
            const startAngle = cumulativePercent * 2 * Math.PI;
            cumulativePercent += slice.percent / 100;
            const endAngle = cumulativePercent * 2 * Math.PI;

            const x1 = Math.cos(startAngle);
            const y1 = Math.sin(startAngle);
            const x2 = Math.cos(endAngle);
            const y2 = Math.sin(endAngle);

            const largeArcFlag = slice.percent > 50 ? 1 : 0;

            if (slice.percent === 100) {
              return <circle key={i} cx="0" cy="0" r="1" fill={WOOD_COLORS[i % WOOD_COLORS.length]} />;
            }

            const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            return (
              <path key={i} d={pathData} fill={WOOD_COLORS[i % WOOD_COLORS.length]}>
                <title>{`${slice.name}: HKD $${slice.value.toFixed(2)} (${slice.percent.toFixed(1)}%)`}</title>
              </path>
            );
          })}
        </svg>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', width: '100%' }}>
          {categoryData.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#efe9e0', padding: '4px 10px', borderRadius: '20px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: WOOD_COLORS[i % WOOD_COLORS.length], borderRadius: '50%' }}></span>
              <span style={{ color: '#4a3525', fontWeight: '500' }}>{item.name}</span>
              <span style={{ color: '#7c6a58' }}>${item.value.toFixed(0)} ({item.percent.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const inputStyle = {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #e2d7c7',
    backgroundColor: '#ffffff',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    color: '#3d2b1f',
    outline: 'none'
  };

  const getCategoryIcon = (catName) => {
    const found = CATEGORIES_WITH_ICONS.find(c => c.name === catName);
    return found ? found.icon : '🏷️';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f6f3ed', padding: '16px 12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        
        {/* 頁面標題 */}
        <div style={{ textAlign: 'center', margin: '10px 0 20px 0' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#4a3525', letterSpacing: '-0.02em', margin: 0 }}>
            ☕ 旅行與消費記帳
          </h1>
          <p style={{ fontSize: '12px', color: '#8c7663', marginTop: '4px' }}>溫暖木質風格 • 輕鬆紀錄每筆花費</p>
        </div>

        {/* 1️⃣ 第一順位：新增消費表單 */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fdfbf7', padding: '20px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(92, 64, 51, 0.05)', border: '1px solid #ece4d8' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '600', color: '#4a3525' }}>✍️ 新增消費紀錄</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input placeholder="項目名稱 (例如: 咖啡 / 門票)" value={form.item} onChange={e => setForm({...form, item: e.target.value})} required style={inputStyle} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <select value={form.currency} onChange={e => handleCurrencyChange(e.target.value)} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="金額" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
              <input type="number" step="0.0001" placeholder="匯率" value={form.exchangeRate} onChange={e => setForm({...form, exchangeRate: e.target.value})} style={inputStyle} />
              <div style={{ backgroundColor: '#f5efe6', border: '1px solid #e0d5c1', padding: '10px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', color: '#735238', textAlign: 'center' }}>
                折合 HKD ${calculatedHKD}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inputStyle}>
                {CATEGORIES_WITH_ICONS.map(c => (
                  <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                ))}
              </select>
              <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} style={inputStyle}>
                {PAYMENT_METHODS.map(p => <option key={p} value={p}>💳 {p}</option>)}
              </select>
            </div>

            {/* 旅程日期選單 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <select 
                value={isCustomTripDate ? 'NEW' : form.tripDate} 
                onChange={e => {
                  if (e.target.value === 'NEW') {
                    setIsCustomTripDate(true);
                  } else {
                    setIsCustomTripDate(false);
                    setForm({...form, tripDate: e.target.value});
                  }
                }} 
                style={inputStyle}
              >
                <option value="">🗓️ 選擇旅程日期...</option>
                {uniqueTripDates.map(d => <option key={d} value={d}>{d}</option>)}
                <option value="NEW">+ 新增旅程日期 (手動輸入)</option>
              </select>

              {isCustomTripDate && (
                <input 
                  placeholder="旅程區間 (例如: 2026/08/05-2026/08/09)" 
                  value={customTripDate} 
                  onChange={e => setCustomTripDate(e.target.value)} 
                  required
                  style={{ ...inputStyle, borderColor: '#8c6d58' }} 
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle} />
              <input placeholder="目的地 (例如: 京都)" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} style={inputStyle} />
            </div>

            <input placeholder="備註 (選填)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={inputStyle} />

            <button 
              type="submit" 
              disabled={isSubmitting} 
              style={{ 
                padding: '14px', 
                background: isSubmitting ? '#a39281' : '#5c4033', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontWeight: '600', 
                fontSize: '15px', 
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(92, 64, 51, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? '儲存中...' : '記錄並同步至 Google Sheet'}
            </button>
          </div>
        </form>

        {/* 2️⃣ 第二順位：消費概覽與統計 */}
        <div style={{ 
          backgroundColor: '#f5efe6', 
          border: '1px solid #e6dcce',
          color: '#4a3525', 
          padding: '20px', 
          borderRadius: '20px', 
          marginBottom: '20px',
          boxShadow: '0 4px 15px rgba(92, 64, 51, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#7c6a58', fontWeight: '600' }}>📊 消費總覽與分析</span>
            <select 
              value={filterTripDate} 
              onChange={e => handleFilterTripDateChange(e.target.value)} 
              style={{ 
                padding: '6px 10px', 
                borderRadius: '8px', 
                border: '1px solid #d4c5b3', 
                background: '#ffffff', 
                color: '#4a3525', 
                fontSize: '12px',
                outline: 'none'
              }}
            >
              <option value="ALL">全部行程總計</option>
              {uniqueTripDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8c7663' }}>
              {filterTripDate === 'ALL' ? '個人開支總計' : `行程 [${filterTripDate}] 個人花費`}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#5c4033', marginTop: '2px', letterSpacing: '-0.03em' }}>
              HKD ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* 獨立小計 */}
          <div style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e8dec8' }}>
            <div style={{ fontSize: '12px', color: '#8c7663', fontWeight: '600', marginBottom: '6px' }}>
              🛍️ 獨立小計
            </div>
            <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#4a3525' }}>
              <span>wiki: <strong>${excludedItemsSummary.wikiTotal.toFixed(1)}</strong></span>
              <span>代購: <strong>${excludedItemsSummary.proxyTotal.toFixed(1)}</strong></span>
            </div>
          </div>

          {/* 圓形圖 */}
          <div style={{ borderTop: '1px solid #e0d5c1', marginTop: '16px', paddingTop: '12px' }}>
            <div style={{ fontSize: '12px', textAlign: 'center', color: '#8c7663' }}>🏷️ 個人類別消費佔比</div>
            {renderPieChart()}
          </div>
        </div>

        {/* 3️⃣ 第三順位：明細列表 */}
        <div style={{ backgroundColor: '#fdfbf7', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(92, 64, 51, 0.05)', border: '1px solid #ece4d8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#4a3525' }}>📋 消費明細 ({finalFilteredExpenses.length})</h3>
            <button 
              onClick={fetchFromGoogleSheet} 
              disabled={isLoading} 
              style={{ padding: '6px 12px', background: '#efe9e0', color: '#5c4033', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
            >
              {isLoading ? '同步中...' : '🔄 重新整理'}
            </button>
          </div>

          {/* 🏷️ 類別多選 Filter 區塊 */}
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #e2d7c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8c7663', fontWeight: '600' }}>🔍 依類別篩選 (點擊可多選)：</span>
              {selectedCategories.length > 0 && (
                <button 
                  onClick={() => setSelectedCategories([])}
                  style={{ background: 'none', border: 'none', color: '#a0522d', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  清除重設
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIES_WITH_ICONS.map(cat => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategoryFilter(cat.name)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: isSelected ? '600' : 'normal',
                      border: isSelected ? '1px solid #5c4033' : '1px solid #e2d7c7',
                      backgroundColor: isSelected ? '#5c4033' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#4a3525',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.icon} {cat.name} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#a39281', margin: '-4px 0 12px 0' }}>💡 提示：點擊任何一筆消費明細，可快速複製資料至上方表單。</p>

          {isLoading ? (
            <p style={{ color: '#a39281', textAlign: 'center', padding: '20px 0', fontSize: '13px' }}>資料同步中...</p>
          ) : finalFilteredExpenses.length === 0 ? (
            <p style={{ color: '#a39281', textAlign: 'center', padding: '20px 0', fontSize: '13px' }}>該篩選條件下無消費紀錄</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paginatedExpenses.map((e, index) => (
                  <div 
                    key={index} 
                    onClick={() => handleCopyExpenseToForm(e)}
                    title="點擊以複製此筆資料到新增表單"
                    style={{ 
                      padding: '12px 14px', 
                      borderRadius: '12px', 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #eee6db', 
                      display: 'flex', 
                      justify: 'space-between', 
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out'
                    }}
                    onMouseEnter={(evt) => evt.currentTarget.style.borderColor = '#8c6d58'}
                    onMouseLeave={(evt) => evt.currentTarget.style.borderColor = '#eee6db'}
                  >
                    {/* 左側：項目與細節說明 (自動佔滿剩餘空間) */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>{getCategoryIcon(e.category)}</span>
                        <strong style={{ fontSize: '14px', color: '#3d2b1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.item}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#8c7663', flexWrap: 'wrap' }}>
                        <span>{e.date}</span>
                        <span>•</span>
                        <span style={{ backgroundColor: '#efe9e0', color: '#5c4033', padding: '1px 6px', borderRadius: '4px' }}>{e.category}</span>
                        <span style={{ backgroundColor: '#f5efe6', color: '#735238', padding: '1px 6px', borderRadius: '4px' }}>{e.paymentMethod}</span>
                        {e.destination && <span>• {e.destination}</span>}
                      </div>
                    </div>

                    {/* 右側：金額資訊 (固定靠最右側) */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: e.category === 'wiki' || e.category === '代購' ? '#b85e32' : '#5c4033' }}>
                        HKD ${e.amountHKD ? e.amountHKD.toFixed(2) : '0.00'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#a39281' }}>
                        {e.currency} ${e.amount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分頁按鈕 */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2d7c7', background: currentPage === 1 ? '#f6f3ed' : '#ffffff', color: '#5c4033', fontSize: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ◀ 上一頁
                  </button>
                  <span style={{ fontSize: '12px', color: '#7c6a58' }}>第 {currentPage} / {totalPages} 頁</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2d7c7', background: currentPage === totalPages ? '#f6f3ed' : '#ffffff', color: '#5c4033', fontSize: '12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    下一頁 ▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
