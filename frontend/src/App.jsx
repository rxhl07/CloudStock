import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { signIn, fetchAuthSession, signOut, getCurrentUser } from 'aws-amplify/auth';
import Navbar from './components/Navbar';
import StockChart from './components/StockChart';
import { AlertTriangle, RefreshCw, PlusCircle, MinusCircle, ShieldCheck } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL;

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Update form state
  const [selectedSku, setSelectedSku] = useState('');
  const [quantityDelta, setQuantityDelta] = useState(0);
  const [lowStockAlert, setLowStockAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Check active auth session on load
  useEffect(() => {
    checkCurrentUser();
    fetchInventory();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser.username || currentUser.signInDetails?.loginId);
    } catch {
      setUser(null);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { isSignedIn } = await signIn({ username: email, password });
      if (isSignedIn) {
        setUser(email);
        alert('Authenticated successfully via Amazon Cognito!');
      }
    } catch (err) {
      alert('Login Error: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/inventory`);
      setItems(res.data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (skuToUpdate, delta) => {
    const sku = skuToUpdate || selectedSku;
    const change = delta !== undefined ? delta : parseInt(quantityDelta);

    if (!user) {
      alert('Unauthorized: You must log in as a Manager to alter stock levels.');
      return;
    }

    try {
      // Step 1: Pull secure session token down from Cognito
      const session = await fetchAuthSession();
      const jwtToken = session.tokens?.idToken?.toString();

      // Step 2: Make POST request with Authorization Header
      const response = await axios.post(
        `${API_BASE_URL}/inventory/update`,
        { sku: sku, quantityChange: change },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`
          }
        }
      );

      // Step 3: Check alert condition flag returned by Lambda
      if (response.data.lowStockAlert) {
        setLowStockAlert(true);
        setAlertMessage(`CRITICAL WARNING: Stock for SKU '${sku}' fell below 5 units!`);
      } else {
        setLowStockAlert(false);
      }

      // Step 4: Refresh inventory table
      fetchInventory();
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed updating stock: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-6">

        {/* Low Stock Dynamic Warning Banner */}
        {lowStockAlert && (
          <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-pulse">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <div className="font-bold">{alertMessage}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Auth Card / Stock Adjustment Panel */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            {!user ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-lg border-b pb-2">
                  <ShieldCheck className="h-5 w-5" /> Manager Sign In
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition"
                >
                  Authenticate
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Quick Adjustment</h3>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Target SKU</label>
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="">-- Select SKU --</option>
                    {items.map((i) => (
                      <option key={i.sku} value={i.sku}>{i.itemName} ({i.sku})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Quantity Delta (+ / -)</label>
                  <input
                    type="number"
                    value={quantityDelta}
                    onChange={(e) => setQuantityDelta(e.target.value)}
                    placeholder="e.g. -5 or 10"
                    className="w-full mt-1 p-2 border rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={() => handleUpdateStock()}
                  disabled={!selectedSku || quantityDelta === 0}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-2.5 rounded-lg text-sm font-medium transition"
                >
                  Apply Change
                </button>
              </div>
            )}
          </div>

          {/* Interactive Chart */}
          <div className="md:col-span-2">
            <StockChart items={items} />
          </div>
        </div>

        {/* Live Inventory Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Inventory Items ({items.length})</h3>
            <button
              onClick={fetchInventory}
              className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-slate-500 uppercase text-xs">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.sku} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{item.sku}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{item.itemName}</td>
                  <td className="py-3 px-4">${item.price}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${item.quantity < 5
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                        }`}
                    >
                      {item.quantity} units
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleUpdateStock(item.sku, 5)}
                      className="inline-flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 transition"
                      title="Add 5 units"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> +5
                    </button>
                    <button
                      onClick={() => handleUpdateStock(item.sku, -5)}
                      className="inline-flex items-center gap-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded border border-rose-200 transition"
                      title="Subtract 5 units"
                    >
                      <MinusCircle className="h-3.5 w-3.5" /> -5
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}