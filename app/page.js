'use client';
import { useState, useEffect, useMemo } from 'react';

// ⚠️ 請將下方網址替換為你在 Google Apps Script 取得的部署網址
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPylNFwH94mMWD0PEhxVzCVQkIffukv28r5GcxosiBvDdcQrZRlVSnWsv-yFrUvnaHvQ/exec';

const CURRENCIES = ['HKD', 'MOP', 'KRW', 'JPY', 'TWD', 'RMB', 'MYR', 'SGD'];

const CATEGORIES = [
  '未分類', 'Share', 'wiki', '機票', '酒店', '飲食', '衣物', '手信', '退稅',
  '演唱會', '交通', '娛樂', '公仔/扭蛋', '團費', '代購', '雜項',
  'ZB1', '家', '門票', '日用品', '化妝品/飾物', '文具', '禮物'
];
const PAYMENT_METHODS = ['AE', 'MOX', '工商銀聯', '大西洋', '大豐', '工商', '中銀', '現金', 'Alipay HK', '渣打'];

// 圖表顏色庫
const PIE_COLORS = [
  '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D01',
  '#46BDC6', '#7BAAF7', '#F07B72', '#FCD271', '#57BB6A',
  '#A142F4', '#E91E63', '#00BCD4', '#8BC34A', '#FF9800'
];

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 動態預設匯率（從 Google Sheet Rates 分頁抓取）
  const [defaultRates, setDefaultRates] = useState({
    HKD: '1.0', MOP: '0.97', JPY: '0.051', KRW: '0.0058',
    TWD: '0.24', RMB: '1.09', MYR: '1.75', SGD: '5.85'
  });

  // 旅程日期篩選狀態
  const [filterTripDate, setFilterTripDate] = useState('ALL');
  const [isCustomTripDate, setIsCustomTripDate] = useState(false);
  const [customTripDate, setCustomTripDate] = useState('');

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  // 1. 網頁載入時，自動讀取上一次使用的選項 (包含概覽篩選)
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

      // 自動還原「消費概覽與計算」的上次篩選
      if (lastFilterTripDate) {
        setFilterTripDate(lastFilterTripDate);
      }
    }
  }, [defaultRates]);

  // 切換消費概覽篩選時，同步記錄至 localStorage
  const handleFilterTripDateChange = (selectedDate) => {
    setFilterTripDate(selectedDate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_filterTripDate', selectedDate);
    }
  };

  // 自動抓取 Sheet 中所有不重複的「旅程日期」選項
  const uniqueTripDates = useMemo(() => {
    const dates = expenses.map(e => e.tripDate).filter(Boolean);
    return Array.from(new Set(dates));
  }, [expenses]);

  // 從 Google Sheet 抓取最新資料與匯率表
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

  // 切換貨幣時，自動讀取最新匯率表中的預設值
  const handleCurrencyChange = (selectedCurrency) => {
    const defaultRate = defaultRates[selectedCurrency] || '1.0';
    setForm(prev => ({
      ...prev,
      currency: selectedCurrency,
      exchangeRate: defaultRate
    }));
  };

  // 金額 (HKD) 計算公式：金額 * 外幣匯率
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

    // 儲存本次使用的表單選項至 localStorage
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

    // 重置表單
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

  // 根據選擇的旅程日期篩選資料
  const filteredExpenses = useMemo(() => {
    if (filterTripDate === 'ALL') return expenses;
    return expenses.filter(e => e.tripDate === filterTripDate);
  }, [expenses, filterTripDate]);

  // 排除 "wiki" 與 "代購" 的消費列表
  const personalExpenses = useMemo(() => {
    return filteredExpenses.filter(e => e.category !== 'wiki' && e.category !== '代購');
  }, [filteredExpenses]);

  // 個人總花費（不含 wiki & 代購）
  const grandTotal = useMemo(() => {
    return personalExpenses.reduce((sum, e) => sum + (e.amountHKD || 0), 0);
  }, [personalExpenses]);

  // 單獨計算 "wiki" 與 "代購" 總和
  const excludedItemsSummary = useMemo(() => {
    let wikiTotal = 0;
    let proxyTotal = 0;
    filteredExpenses.forEach(e => {
      if (e.category === 'wiki') wikiTotal += (e.amountHKD || 0);
      if (e.category === '代購') proxyTotal += (e.amountHKD || 0);
    });
    return {
      wikiTotal,
      proxyTotal,
      combinedTotal: wikiTotal + proxyTotal
    };
  }, [filteredExpenses]);

  // 計算每個類別的總消費金額與百分比 (圓形圖用)
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

  // 分頁計算邏輯
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  // 原生 SVG 圓形圖繪製邏輯
  const renderPieChart = () => {
    if (grandTotal === 0 || categoryData.length === 0) {
      return <p style={{ color: '#888', textAlign: 'center', margin: '15px 0' }}>尚無個人消費數據可繪製圓形圖</p>;
    }

    let cumulativePercent = 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '160px', height: '160px', borderRadius: '50%' }}>
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', width: '100%' }}>
          {categoryData.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block', borderRadius: '2px' }}></span>
              <span>{item.name}: <strong>HKD ${item.value.toFixed(1)}</strong> ({item.percent.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const inputStyle = {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px'
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#333', boxSizing: 'border-box' }}>
      <h1 style={{ textAlign: 'center', color: '#1a73e8', fontSize: '22px', margin: '15px 0' }}>✈️ 旅遊記帳與消費分析</h1>

      {/* 新增消費表單 */}
      <form onSubmit={handleSubmit} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e0e0e0', boxSizing: 'border-box' }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', color: '#444' }}>新增消費</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <input placeholder="項目名稱 (如: 晚餐)" value={form.item} onChange={e => setForm({...form, item: e.target.value})} required style={inputStyle} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <select value={form.currency} onChange={e => handleCurrencyChange(e.target.value)} style={inputStyle}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="金額" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
            <input type="number" step="0.0001" placeholder="外幣匯率" value={form.exchangeRate} onChange={e => setForm({...form, exchangeRate: e.target.value})} style={inputStyle} />
            <div style={{ background: '#e8f0fe', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', color: '#1967d2', textAlign: 'center', whiteSpace: 'nowrap' }}>
              折合 HKD: ${calculatedHKD}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} style={inputStyle}>
              {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* 旅程日期下拉選單 */}
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
              <option value="">選擇旅程日期...</option>
              {uniqueTripDates.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="NEW">+ 新增旅程日期 (手動輸入)</option>
            </select>

            {isCustomTripDate && (
              <input 
                placeholder="輸入旅程日期區間 (例: 2026/08/05-2026/08/09)" 
                value={customTripDate} 
                onChange={e => setCustomTripDate(e.target.value)} 
                required
                style={{ ...inputStyle, borderColor: '#1a73e8' }} 
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle} />
            <input placeholder="目的地 (如: 東京)" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} style={inputStyle} />
          </div>

          <input placeholder="備註" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={inputStyle} />

          <button type="submit" disabled={isSubmitting} style={{ padding: '12px', background: isSubmitting ? '#ccc' : '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: '5px' }}>
            {isSubmitting ? '儲存中...' : '記錄並同步至 Google Sheet'}
          </button>
        </div>
      </form>

      {/* 統計與圓形圖消費分析 */}
      <div style={{ background: '#e6f4ea', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ceead6', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#137333', fontSize: '16px' }}>📊 消費概覽與計算</h3>
            {/* 2. 概覽選單切換時調用 handleFilterTripDateChange 儲存歷史紀錄 */}
            <select value={filterTripDate} onChange={e => handleFilterTripDateChange(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #137333', background: '#fff', fontSize: '13px' }}>
              <option value="ALL">全部行程總計</option>
              {uniqueTripDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ fontSize: '16px', marginTop: '5px' }}>
            {filterTripDate === 'ALL' ? '所有紀錄總花費 (不含wiki/代購)' : `行程 [${filterTripDate}] 個人總花費`}：
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d93025', marginTop: '2px' }}>
              HKD ${grandTotal.toFixed(2)}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #b7e1cd', marginTop: '5px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#137333', marginBottom: '4px' }}>
              🛍️ 獨立統計項目 (wiki / 代購)：
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#555', flexWrap: 'wrap', gap: '5px' }}>
              <span>wiki 總計: <strong>HKD ${excludedItemsSummary.wikiTotal.toFixed(2)}</strong></span>
              <span>代購 總計: <strong>HKD ${excludedItemsSummary.proxyTotal.toFixed(2)}</strong></span>
            </div>
            <div style={{ fontSize: '13px', color: '#137333', borderTop: '1px dashed #e0e0e0', paddingTop: '4px', marginTop: '4px', fontWeight: 'bold' }}>
              小計總和: HKD ${excludedItemsSummary.combinedTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #ceead6', margin: '15px 0' }} />
        <h4 style={{ margin: 0, color: '#137333', textAlign: 'center', fontSize: '15px' }}>🏷️ 個人消費類別佔比 (排除 wiki/代購)</h4>
        {renderPieChart()}
      </div>

      {/* 消費明細與分頁控制器 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>消費明細 ({filteredExpenses.length} 筆)</h3>
          <button onClick={fetchFromGoogleSheet} disabled={isLoading} style={{ padding: '6px 12px', background: '#34a853', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            {isLoading ? '同步中...' : '🔄 重新整理'}
          </button>
        </div>

        {isLoading ? (
          <p style={{ color: '#666', textAlign: 'center' }}>載入 Google Sheet 資料中...</p>
        ) : filteredExpenses.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>該行程暫無紀錄</p>
        ) : (
          <>
            <ul style={{ paddingLeft: '0', listStyle: 'none', margin: 0 }}>
              {paginatedExpenses.map((e, index) => (
                <li key={index} style={{ padding: '12px 8px', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '15px' }}>{e.item}</strong>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: e.category === 'wiki' || e.category === '代購' ? '#e65100' : '#1a73e8' }}>
                      HKD ${e.amountHKD.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {e.currency} ${e.amount} | {e.date} | <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{e.category}</span> | {e.paymentMethod} {e.destination ? `| ${e.destination}` : ''}
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: currentPage === 1 ? '#eee' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  ◀ 上一頁
                </button>
                <span style={{ fontSize: '14px' }}>第 {currentPage} / {totalPages} 頁</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: currentPage === totalPages ? '#eee' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  下一頁 ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
