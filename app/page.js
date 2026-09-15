'use client';

import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PlusCircle, Wallet, Compass, Sparkles, Receipt, Calculator } from 'lucide-react';

// 選項資料（來自截圖）
const CURRENCIES = ['HKD', 'MOP', 'KRW', 'JPY', 'TWD', 'RMB', 'MYR', 'SGD'];
const CATEGORIES = [
  'Share', 'wiki', '機票', '酒店', '飲食', '衣物', '手信', '退稅',
  '演唱會', '交通', '娛樂', '公仔/扭蛋', '團費', '代購', '雜項',
  'ZB1', '家', '門票', '日用品', '化妝品/飾物', '文具', '禮物'
];
const PAYMENT_METHODS = [
  'AE', 'MOX', '工商銀聯', '大西洋', '大豐', '工商', '中銀', '現金', 'Alipay HK', '渣打'
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8884d8'];

export default function TravelExpenseApp() {
  const [expenses, setExpenses] = useState([
    {
      id: 1,
      item: '東京拉麵',
      currency: 'JPY',
      amount: 1500,
      exchangeRate: 0.052, // 初始匯率
      actualFeeHKD: 0,
      amountHKD: 78,
      category: '飲食',
      date: '2026-05-10',
      paymentMethod: 'MOX',
      destination: '日本東京',
      tripDates: '2026-05-09 ~ 2026-05-15',
      note: '無敵家拉麵'
    },
    {
      id: 2,
      item: 'ZB1 周邊公仔',
      currency: 'JPY',
      amount: 4500,
      exchangeRate: 0.052,
      actualFeeHKD: 5,
      amountHKD: 239,
      category: 'ZB1',
      date: '2026-05-11',
      paymentMethod: 'AE',
      destination: '日本東京',
      tripDates: '2026-05-09 ~ 2026-05-15',
      note: '澀谷快閃店'
    }
  ]);

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
    tripDates: '',
    note: ''
  });

  // 自動計算 HKD 金額
  const calculatedHKD = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const rate = parseFloat(form.exchangeRate) || 1;
    const fee = parseFloat(form.actualFeeHKD) || 0;
    return (amt * rate + fee).toFixed(2);
  }, [form.amount, form.exchangeRate, form.actualFeeHKD]);

  // 表單變更處理
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // 新增紀錄
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.item || !form.amount) return;

    const newExpense = {
      id: Date.now(),
      ...form,
      amount: parseFloat(form.amount),
      exchangeRate: parseFloat(form.exchangeRate),
      actualFeeHKD: parseFloat(form.actualFeeHKD),
      amountHKD: parseFloat(calculatedHKD)
    };

    setExpenses([newExpense, ...expenses]);
    setForm({
      item: '',
      currency: 'HKD',
      amount: '',
      exchangeRate: '1.0',
      actualFeeHKD: '0',
      category: '飲食',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '現金',
      destination: form.destination, // 保留目的地方便連續輸入
      tripDates: form.tripDates,
      note: ''
    });
  };

  // 按類別統計 (圓形圖)
  const categoryData = useMemo(() => {
    const stats = {};
    expenses.forEach(exp => {
      stats[exp.category] = (stats[exp.category] || 0) + exp.amountHKD;
    });
    return Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
  }, [expenses]);

  // 按旅程總消費統計
  const tripData = useMemo(() => {
    const stats = {};
    expenses.forEach(exp => {
      const key = exp.destination || '未分類旅程';
      stats[key] = (stats[key] || 0) + exp.amountHKD;
    });
    return stats;
  }, [expenses]);

  // AI 評價與分析生成邏輯
  const aiEvaluation = useMemo(() => {
    if (expenses.length === 0) return '尚無消費資料，請新增消費以獲取 AI 分析。';
    const total = expenses.reduce((sum, e) => sum + e.amountHKD, 0);
    const topCategory = [...categoryData].sort((a, b) => b.value - a.value)[0];

    let evalText = `本次統計總消費金額為 **HKD ${total.toFixed(2)}**。`;
    if (topCategory) {
      const percentage = ((topCategory.value / total) * 100).toFixed(1);
      evalText += ` 最高支出類別為「**${topCategory.name}**」，佔比高達 **${percentage}%**。`;

      if (['ZB1', '公仔/扭蛋', '演唱會'].includes(topCategory.name)) {
        evalText += ' 💡 **AI 評語**：您屬於追星與娛樂愛好型玩家！在周邊與現場體驗上的投入較高，建議在出發前預留特定預算專區，善用高海外刷卡回饋信用卡（如 AE 或 Mox）以賺取積分與現金回饋。';
      } else if (topCategory.name === '飲食') {
        evalText += ' 💡 **AI 評語**：您是一位美食探索家！大部分開支用於品嚐當地美食，消費結構非常健康且符合旅遊體驗導向。';
      } else if (['酒店', '機票'].includes(topCategory.name)) {
        evalText += ' 💡 **AI 評語**：主要開支集中於基礎行程與住宿，現場零星消費控制得宜，是一位理性且善於規劃的旅行者。';
      } else {
        evalText += ' 💡 **AI 評語**：消費類別較為分散，整體財務分配均衡。';
      }
    }
    return evalText;
  }, [expenses, categoryData]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen">
      <header className="mb-8 border-b pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Compass className="text-blue-600" /> 多幣種旅遊記賬 & AI 消費分析
          </h1>
          <p className="text-sm text-slate-500 mt-1">基準貨幣：港幣 (HKD)</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：記賬表單 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
            <PlusCircle size={20} className="text-blue-500" /> 新增消費項目
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-600 mb-1">項目名稱</label>
              <input type="text" name="item" value={form.item} onChange={handleInputChange} required className="w-full p-2 border rounded-md" placeholder="例: 晚餐/迪士尼門票" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-1">貨幣</label>
                <select name="currency" value={form.currency} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">外幣金額</label>
                <input type="number" step="0.01" name="amount" value={form.amount} onChange={handleInputChange} required className="w-full p-2 border rounded-md" placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-1">匯率 (對 HKD)</label>
                <input type="number" step="0.0001" name="exchangeRate" value={form.exchangeRate} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">結算手續費 (HKD)</label>
                <input type="number" step="0.01" name="actualFeeHKD" value={form.actualFeeHKD} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="0.0" />
              </div>
            </div>

            <div className="p-2 bg-blue-50 rounded-md text-blue-800 font-medium text-xs flex justify-between items-center">
              <span>折合港幣金額:</span>
              <span className="text-sm font-bold">HKD ${calculatedHKD}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-1">類別</label>
                <select name="category" value={form.category} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">付款方式</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleInputChange} className="w-full p-2 border rounded-md">
                  {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-1">消費日期</label>
                <input type="date" name="date" value={form.date} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">目的地</label>
                <input type="text" name="destination" value={form.destination} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="例: 日本東京" />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">備註</label>
              <input type="text" name="note" value={form.note} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="備註說明..." />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium">
              記錄消費
            </button>
          </form>
        </div>

        {/* 右側：數據分析與報表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI 評語區塊 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
            <h3 className="text-md font-bold text-indigo-900 flex items-center gap-2 mb-2">
              <Sparkles className="text-indigo-600" size={18} /> AI 消費模式評價
            </h3>
            <p className="text-sm text-indigo-950 leading-relaxed">{aiEvaluation}</p>
          </div>

          {/* 圖表與總計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 消費類別圓形圖 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">各類別消費比例 (HKD)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `HKD ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 旅程總消費 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">各旅程總消費</h3>
              <div className="space-y-2">
                {Object.entries(tripData).map(([dest, total]) => (
                  <div key={dest} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">{dest}</span>
                    <span className="text-sm font-bold text-slate-900">HKD ${total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 明細清單 */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Receipt size={16} /> 消費明細歷史
            </h3>
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase">
                <tr>
                  <th className="p-2">項目</th>
                  <th className="p-2">原幣/金額</th>
                  <th className="p-2">匯率/手續費</th>
                  <th className="p-2">折合 HKD</th>
                  <th className="p-2">類別</th>
                  <th className="p-2">付款方式</th>
                  <th className="p-2">日期/目的地</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-2 font-medium text-slate-900">{e.item}</td>
                    <td className="p-2">{e.currency} ${e.amount}</td>
                    <td className="p-2">{e.exchangeRate} / ${e.actualFeeHKD}</td>
                    <td className="p-2 font-bold text-blue-600">HKD ${e.amountHKD}</td>
                    <td className="p-2"><span className="px-2 py-0.5 bg-slate-100 rounded-full">{e.category}</span></td>
                    <td className="p-[#2]">{e.paymentMethod}</td>
                    <td className="p-2">{e.date} ({e.destination})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
