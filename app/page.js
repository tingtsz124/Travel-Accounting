'use client';
import { useState, useEffect, useMemo } from 'react';

// ⚠️ 請將下方網址替換為你在 Google Apps Script 取得的部署網址
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPylNFwH94mMWD0PEhxVzCVQkIffukv28r5GcxosiBvDdcQrZRlVSnWsv-yFrUvnaHvQ/exec';

const CURRENCIES = ['HKD', 'MOP', 'KRW', 'JPY', 'TWD', 'RMB', 'MYR', 'SGD'];
const CATEGORIES = [
  'Share', 'wiki', '機票', '酒店', '飲食', '衣物', '手信', '退稅',
  '演唱會', '交通', '娛樂', '公仔/扭蛋', '團費', '代購', '雜項',
  'ZB1', '家', '門票', '日用品', '化妝品/飾物', '文具', '禮物'
];
const PAYMENT_METHODS = ['AE', 'MOX', '工商銀聯', '大西洋', '大豐', '工商', '中銀', '現金', 'Alipay HK', '渣打'];

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 旅程日期篩選與自訂狀態
  const [filterTripDate, setFilterTripDate] = useState('ALL');
  const [isCustomTripDate, setIsCustomTripDate] = useState(false);
  const [customTripDate, setCustomTripDate] = useState('');

  const [form, setForm] = useState({
    item: '',
    currency: 'HKD',
    amount: '',
    exchangeRate: '1.0',
    category: '飲食',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '現金',
    note: '',
    destination: '',
    tripDate: ''
  });

  // 自動抓取 Sheet 中所有不重複的「旅程日期」選項
  const uniqueTripDates = useMemo(() => {
    const dates = expenses.map(e => e.tripDate).filter(Boolean);
    return Array.from(new Set(dates));
  }, [expenses]);

  // 從 Google Sheet 抓取最新資料
  const fetchFromGoogleSheet = async () => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL') return;
    setIsLoading(true);
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExpenses(data.reverse()); // 最新輸入的顯示在最上方
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

  // 1. 金額 (HKD) 計算公式：金額 * 外幣匯率
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

    setForm(prev => ({ ...prev, item: '', amount: '', note: '' }));
    setIsSubmitting(false);
  };

  // 根據選擇的旅程日期篩選資料與計算總花費
  const filteredExpenses = useMemo(() => {
    if (filterTripDate === 'ALL') return expenses;
    return expenses.filter(e => e.tripDate === filterTripDate);
  }, [expenses, filterTripDate]);

  const grandTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amountHKD || 0), 0);
  }, [filteredExpenses]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <h1 style={{ textAlign: 'center', color: '#1a73e8' }}>✈️ 旅遊記帳與消費分析</h1>

      {/* 新增消費表單 */}
      <form onSubmit={handleSubmit} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3 style={{ marginTop: 0 }}>新增消費</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          <input placeholder="項目名稱 (如: 晚餐)" value={form.item} onChange={e => setForm({...form, item: e.target.value})} required style={{ padding: '8px' }} />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} style={{ padding: '8px' }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="金額" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required style={{ padding: '8px', flex: 1 }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="number" step="0.0001" placeholder="外幣匯率" value={form.exchangeRate} onChange={e => setForm({...form, exchangeRate: e.target.value})} style={{ padding: '8px', flex: 1 }} />
            <div style={{ background: '#e8f0fe', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', minWidth: '130px' }}>
              折合 HKD: ${calculatedHKD}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ padding: '8px', flex: 1 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} style={{ padding: '8px', flex: 1 }}>
              {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* 旅程日期下拉選單與自訂輸入 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
              style={{ padding: '8px' }}
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
                style={{ padding: '8px', borderColor: '#1a73e8' }} 
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ padding: '8px' }} />
            <input placeholder="目的地 (如: 日本東京)" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} style={{ padding: '8px', flex: 1 }} />
          </div>

          <input placeholder="備註" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={{ padding: '8px' }} />

          <button type="submit" disabled={isSubmitting} style={{ padding: '10px', background: isSubmitting ? '#ccc' : '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSubmitting ? '儲存中...' : '記錄並同步至 Google Sheet'}
          </button>
        </div>
      </form>

      {/* 統計與行程消費篩選 */}
      <div style={{ background: '#e6f4ea', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#137333' }}>📊 消費概覽與計算</h3>
          <select value={filterTripDate} onChange={e => setFilterTripDate(e.target.value)} style={{ padding: '6px' }}>
            <option value="ALL">全部行程總計</option>
            {uniqueTripDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <p style={{ fontSize: '18px', marginTop: '10px', marginBottom: 0 }}>
          {filterTripDate === 'ALL' ? '所有紀錄總花費' : `行程 [${filterTripDate}] 總花費`}：
          <strong style={{ color: '#d93025' }}> HKD ${grandTotal.toFixed(2)}</strong>
        </p>
      </div>

      {/* 明細列表 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>消費明細</h3>
          <button onClick={fetchFromGoogleSheet} disabled={isLoading} style={{ padding: '6px 12px', background: '#34a853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isLoading ? '同步中...' : '🔄 重新整理資料'}
          </button>
        </div>

        {isLoading ? <p style={{ color: '#666' }}>載入 Google Sheet 資料中...</p> : filteredExpenses.length === 0 ? <p style={{ color: '#888' }}>暫無紀錄</p> : (
          <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
            {filteredExpenses.map((e, index) => (
              <li key={index} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <strong>{e.item}</strong> - {e.currency} ${e.amount} (折合 HKD ${e.amountHKD})
                <br />
                <small style={{ color: '#666' }}>
                  {e.date} | {e.category} | {e.paymentMethod} {e.destination ? `| ${e.destination}` : ''} {e.tripDate ? `| 🗓️ ${e.tripDate}` : ''}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
