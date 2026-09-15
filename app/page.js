'use client';
import { useState, useMemo } from 'react';

const CURRENCIES = ['HKD', 'MOP', 'KRW', 'JPY', 'TWD', 'RMB', 'MYR', 'SGD'];
const CATEGORIES = ['飲食', '交通', '機票', '酒店', 'ZB1', '門票', '娛樂', '購物', '雜項'];
const PAYMENT_METHODS = ['AE', 'MOX', '工商銀聯', '大西洋', '大豐', '工商', '中銀', '現金', 'Alipay HK', '渣打'];

export default function Home() {
  const [expenses, setExpenses] = useState([]);
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

  const calculatedHKD = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const rate = parseFloat(form.exchangeRate) || 1;
    const fee = parseFloat(form.actualFeeHKD) || 0;
    return (amt * rate + fee).toFixed(2);
  }, [form.amount, form.exchangeRate, form.actualFeeHKD]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.item || !form.amount) return;

    const newExpense = {
      id: Date.now(),
      ...form,
      amountHKD: parseFloat(calculatedHKD)
    };

    setExpenses([newExpense, ...expenses]);
    setForm(prev => ({ ...prev, item: '', amount: '', note: '' }));
  };

  const categoryTotals = useMemo(() => {
    const totals = {};
    expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amountHKD;
    });
    return totals;
  }, [expenses]);

  const grandTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amountHKD, 0);
  }, [expenses]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <h1 style={{ textAlign: 'center', color: '#1a73e8' }}>✈️ 旅遊記帳與消費分析</h1>

      {/* 記帳表單 */}
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

          <button type="submit" style={{ padding: '10px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            記錄消費
          </button>
        </div>
      </form>

      {/* 統計與 AI 分析 */}
      <div style={{ background: '#e6f4ea', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#137333' }}>🤖 AI 消費分析卡片</h3>
        <p>總花費金額：<strong>HKD ${grandTotal.toFixed(2)}</strong></p>
        {expenses.length > 0 ? (
          <div>
            <p>目前記錄了 <strong>{expenses.length}</strong> 筆消費。消費比例最高的類別統計如下：</p>
            <ul>
              {Object.entries(categoryTotals).map(([cat, total]) => (
                <li key={cat}><strong>{cat}</strong>: HKD ${total.toFixed(2)} ({((total / grandTotal) * 100).toFixed(1)}%)</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>尚無消費資料，新增紀錄後將自動生成分析。</p>
        )}
      </div>

      {/* 歷史列表 */}
      <div>
        <h3>消費明細</h3>
        {expenses.length === 0 ? <p style={{ color: '#888' }}>暫無紀錄</p> : (
          <ul style={{ paddingLeft: '20px' }}>
            {expenses.map(e => (
              <li key={e.id} style={{ marginBottom: '8px' }}>
                <strong>{e.item}</strong> - {e.currency} ${e.amount} (折合 HKD ${e.amountHKD}) | {e.category} | {e.paymentMethod}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
