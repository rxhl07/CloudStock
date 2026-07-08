import React from 'react';
import { Package, LogOut, User } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
    return (
        <nav className="bg-slate-900 text-white px-6 py-4 shadow-md flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Package className="h-7 w-7 text-indigo-400" />
                <span className="text-xl font-bold tracking-wide">CloudStock</span>
            </div>
            <div>
                {user ? (
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-sm text-slate-300">
                            <User className="h-4 w-4" /> {user}
                        </span>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded transition"
                        >
                            <LogOut className="h-3.5 w-3.5" /> Logout
                        </button>
                    </div>
                ) : (
                    <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                        Guest Mode (Read-Only)
                    </span>
                )}
            </div>
        </nav>
    );
}