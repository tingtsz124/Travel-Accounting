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

// 質感馬卡龍配色庫 (圖表用)
const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'
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

  // 篩選與自訂旅程狀態
  const [filterTripDate, setFilterTripDate] = useState('ALL');
  const [isCustomTripDate, setIsCustomTripDate] = useState(false);
  const [customTripDate, setCustomTripDate] = useState('');

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
  }, [filterTripDate]);

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

  const filteredExpenses = useMemo(() => {
    if (filterTripDate === 'ALL') return expenses;
    return expenses.filter(e => e.tripDate === filterTripDate);
  }, [expenses, filterTripDate]);

  const personalExpenses = useMemo(() => {
    return filteredExpenses.filter(e => e.category !== 'wiki' && e.category !== '代購');
  }, [filteredExpenses]);

  const grandTotal = useMemo(() => {
    return personalExpenses.reduce((sum, e) => sum + (e.amountHKD || 0), 0);
  }, [personalExpenses]);

  const excludedItemsSummary = useMemo(() => {
    let wikiTotal = 0;
    let proxyTotal = 0;
    filteredExpenses.forEach(e => {
      if (e.category === 'wiki') wikiTotal += (e.amountHKD || 0);
      if (e.category === '代購') proxyTotal += (e.amountHKD || 0);
    });
    return { wikiTotal, proxyTotal, combinedTotal: wikiTotal + proxyTotal };
  }, [filteredExpenses]);

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

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const renderPieChart = () => {
    if (grandTotal === 0 || categoryData.length === 0) {
      return <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0', fontSize: '13px' }}>尚無消費數據</p>;
    }

    let cumulativePercent = 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '150px', height: '150px', borderRadius: '50%' }}>
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
              return <circle key={i} cx="0" cy="0" r="1" fill={PIE_COLORS[i % PIE_COLORS.length]} />;
            }

            const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            return (
              <path key={i} d={pathData} fill={PIE_COLORS[i % PIE_COLORS.length]}>
                <title>{`${slice.name}: HKD $${slice.value.toFixed(2)} (${slice.percent.toFixed(1)}%)`}</title>
              </path>
            );
          })}
        </svg>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', width: '100%' }}>
          {categoryData.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '20px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], borderRadius: '50%' }}></span>
              <span style={{ color: '#334155', fontWeight: '500' }}>{item.name}</span>
              <span style={{ color: '#64748b' }}>${item.value.toFixed(0)} ({item.percent.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 通用質感輸入框樣式
  const inputStyle = {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    transition: 'all 0.2s ease-in-out'
  };

  // 取得類別對應 Icon
  const getCategoryIcon = (catName) => {
    const found = CATEGORIES_WITH_ICONS.find(c => c.name === catName);
    return found ? found.icon : '🏷️';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px 12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        
        {/* 頁面標題 */}
        <div style={{ textAlign: 'center', margin: '10px 0 20px 0' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            ✈️ 旅行與消費記帳
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>輕鬆記錄每筆花費與旅程開支</p>
        </div>

        {/* 高級深色質感卡片 (消費概覽) */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
          color: '#ffffff', 
          padding: '20px', 
          borderRadius: '20px', 
          marginBottom: '20px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>📊 消費總覽與分析</span>
            <select 
              value={filterTripDate} 
              onChange={e => handleFilterTripDateChange(e.target.value)} 
              style={{ 
                padding: '6px 10px', 
                borderRadius: '8px', 
                border: '1px solid #334155', 
                background: '#0f172a', 
                color: '#f8fafc', 
                fontSize: '12px',
                outline: 'none'
              }}
            >
              <option value="ALL">全部行程總計</option>
              {uniqueTripDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              {filterTripDate === 'ALL' ? '個人開支總計 (排除 wiki/代購)' : `行程 [${filterTripDate}] 個人花費`}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#38bdf8', marginTop: '2px', letterSpacing: '-0.03em' }}>
              HKD ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* 獨立統計項目 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(10px)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>
              🛍️ 獨立小計 (wiki / 代購)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e2e8f0' }}>
              <span>wiki: <strong>${excludedItemsSummary.wikiTotal.toFixed(1)}</strong></span>
              <span>代購: <strong>${excludedItemsSummary.proxyTotal.toFixed(1)}</strong></span>
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>合計: ${excludedItemsSummary.combinedTotal.toFixed(1)}</span>
            </div>
          </div>

          {/* 圓形圖 */}
          <div style={{ borderTop: '1px solid #334155', marginTop: '16px', paddingTop: '12px' }}>
            <div style={{ fontSize: '12px', textAlign: 'center', color: '#94a3b8' }}>🏷️ 個人類別消費佔比</div>
            {renderPieChart()}
          </div>
        </div>

        {/* 新增消費表單 (極簡卡片) */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>➕ 新增消費紀錄</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input placeholder="項目名稱 (例如: 晚餐 / 拍立得)" value={form.item} onChange={e => setForm({...form, item: e.target.value})} required style={inputStyle} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <select value={form.currency} onChange={e => handleCurrencyChange(e.target.value)} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="金額" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
              <input type="number" step="0.0001" placeholder="匯率" value={form.exchangeRate} onChange={e => setForm({...form, exchangeRate: e.target.value})} style={inputStyle} />
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '10px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', color: '#0284c7', textAlign: 'center' }}>
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
                  style={{ ...inputStyle, borderColor: '#0284c7' }} 
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle} />
              <input placeholder="目的地 (例如: 東京)" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} style={inputStyle} />
            </div>

            <input placeholder="備註 (選填)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={inputStyle} />

            <button 
              type="submit" 
              disabled={isSubmitting} 
              style={{ 
                padding: '14px', 
                background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontWeight: '600', 
                fontSize: '15px', 
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? '儲存中...' : '記錄並同步至 Google Sheet'}
            </button>
          </div>
        </form>

        {/* 明細列表 (卡片風格) */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>📋 消費明細 ({filteredExpenses.length})</h3>
            <button 
              onClick={fetchFromGoogleSheet} 
              disabled={isLoading} 
              style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
            >
              {isLoading ? '同步中...' : '🔄 重新整理'}
            </button>
          </div>

          {isLoading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: '13px' }}>資料同步中...</p>
          ) : filteredExpenses.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: '13px' }}>該行程無消費紀錄</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paginatedExpenses.map((e, index) => (
                  <div key={index} style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>{getCategoryIcon(e.category)}</span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{e.item}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                        <span>{e.date}</span>
                        <span>•</span>
                        <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '4px' }}>{e.category}</span>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>{e.paymentMethod}</span>
                        {e.destination && <span>• {e.destination}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: e.category === 'wiki' || e.category === '代購' ? '#ea580c' : '#0284c7' }}>
                        HKD ${e.amountHKD.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
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
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f8fafc' : '#ffffff', color: '#475569', fontSize: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ◀ 上一頁
                  </button>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>第 {currentPage} / {totalPages} 頁</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f8fafc' : '#ffffff', color: '#475569', fontSize: '12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
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
