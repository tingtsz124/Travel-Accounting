'use client';
import { useState, useEffect, useMemo } from 'react';

// ⚠️ 請將下方網址替換為你在 Google Apps Script 取得的部署網址
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPylNFwH94mMWD0PEhxVzCVQkIffukv28r5GcxosiBvDdcQrZRlVSnWsv-yFrUvnaHvQ/exec';

const CURRENCIES = ['HKD', 'MOP', 'KRW', 'JPY', 'TWD', 'RMB', 'MYR', 'SGD'];
const CATEGORIES = ['飲食', '交通', '機票', '酒店', 'ZB1', '門票', '娛樂', '購物', '雜項'];
const PAYMENT_METHODS = ['AE', 'MOX', '工商銀聯', '大西洋', '大豐', '工商', '中銀', '現金', 'Alipay HK', '渣打'];

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    item: '',
    currency: 'HKD',
    amount: '',
    exchangeRate: '1.0',
    actualFeeHKD: '0',
    category: '飲食',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '現金',
    destination: '',
    note: ''
  });

  // 從 Google Sheet 抓取最新資料
  const fetchFromGoogleSheet = async () => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL') return;
    setIsLoading(true);
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        setExpenses(data.reverse()); // 讓最新輸入的顯示在最上面
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

  const calculatedHKD = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const rate = parseFloat(form.exchangeRate) || 1;
    const fee = parseFloat(form.actualFeeHKD) || 0;
    return (amt * rate + fee).toFixed(2);
  }, [form.amount, form.exchangeRate, form.actualFeeHKD]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item || !form.amount) return;

    setIsSubmitting(true);
    const newExpense = {
      id: Date.now(),
      ...form,
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
        // 寫入後重新讀取 Google Sheet 資料
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

  const grandTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amountHKD || 0), 0);
  }, [expenses]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <h1 style={{ textAlign: 'center', color: '#1a73e8' }}>✈️ 旅遊記帳與消費分析</h1>

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

          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" step="0.0001" placeholder="匯率" value={form.exchangeRate} onChange={e => setForm({...form, exchangeRate: e.target.value})} style={{ padding: '8px', flex: 1 }} />
            <input type="number" step="0.01" placeholder="手續費 (HKD)" value={form.actualFeeHKD} onChange={e => setForm({...form, actualFeeHKD: e.target.value})} style={{ padding: '8px', flex: 1 }} />
          </div>

          <div style={{ background: '#e8f0fe', padding: '8px', borderRadius: '4px', fontWeight: 'bold' }}>
            折合 HKD: ${calculatedHKD}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ padding: '8px', flex: 1 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} style={{ padding: '8px', flex: 1 }}>
              {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <input placeholder="目的地 (如: 日本東京)" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} style={{ padding: '8px' }} />
          <input placeholder="備註" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={{ padding: '8px' }} />

          <button type="submit" disabled={isSubmitting} style={{ padding: '10px', background: isSubmitting ? '#ccc' : '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSubmitting ? '儲存中...' : '記錄並同步至 Google Sheet'}
          </button>
        </div>
      </form>

      <div style={{ background: '#e6f4ea', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#137333' }}>📊 總消費概覽</h3>
        <p>目前試算表總花費：<strong>HKD ${grandTotal.toFixed(2)}</strong></p>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>消費明細 (同步自 Google Sheet)</h3>
          <button onClick={fetchFromGoogleSheet} disabled={isLoading} style={{ padding: '6px 12px', background: '#34a853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isLoading ? '同步中...' : '🔄 重新整理資料'}
          </button>
        </div>

        {isLoading ? <p style={{ color: '#666' }}>載入 Google Sheet 資料中...</p> : expenses.length === 0 ? <p style={{ color: '#888' }}>暫無紀錄</p> : (
          <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
            {expenses.map((e, index) => (
              <li key={index} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <strong>{e.item}</strong> - {e.currency} ${e.amount} (折合 HKD ${e.amountHKD})
                <br />
                <small style={{ color: '#666' }}>{e.date} | {e.category} | {e.paymentMethod} {e.destination ? `| ${e.destination}` : ''}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
