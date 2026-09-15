'use client';
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CURRENCIES = ['HKD', 'MOP', 'KRW', 'JPY', 'TWD', 'RMB', 'MYR', 'SGD'];
const CATEGORIES = ['飲食', '交通', '機票', '酒店', 'ZB1', '門票', '娛樂', '購物', '雜項'];
const PAYMENT_METHODS = ['AE', 'MOX', '工商銀聯', '大西洋', '大豐', '工商', '中銀', '現金', 'Alipay HK', '渣打'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({
    item: '', currency: 'HKD', amount: '', exchangeRate: '1.0',
    actualFeeHKD: '0', category: '飲食', date: new Date().toISOString().split('T')[0],
    paymentMethod: '現金', destination: '', note: ''
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
    setExpenses([{ id: Date.now(), ...form, amountHKD: parseFloat(calculatedHKD) }, ...expenses]);
    setForm(prev => ({ ...prev, item: '', amount: '', note: '' }));
  };

  const categoryData = useMemo(() => {
    const stats = {};
    expenses.forEach(e => { stats[e.category] = (stats[e.category] || 0) + e.amountHKD; });
    return Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
  }, [expenses]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>多幣種旅遊記帳</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
        <input placeholder="項目" value={form.item} onChange={e => setForm({...form, item: e.target.value})} required />
        <div>
          <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" step="0.01" placeholder="金額" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
        </div>
        <div>
          <input type="number" step="0.0001" placeholder="匯率" value={form.exchangeRate} onChange={e => setForm({...form, exchangeRate: e.target.value})} />
          <input type="number" step="0.01" placeholder="手續費(HKD)" value={form.actualFeeHKD} onChange={e => setForm({...form, actualFeeHKD: e.target.value})} />
        </div>
        <div>折合 HKD: <strong>${calculatedHKD}</strong></div>
        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
          {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input placeholder="目的地" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
        <button type="submit" style={{ padding: '10px', background: '#0070f3', color: '#fff', border: 'none' }}>新增紀錄</button>
      </form>

      {categoryData.length > 0 && (
        <div style={{ height: '250px', marginBottom: '20px' }}>
          <h3>消費類別統計</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
