// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'bg-green-700' : '';
  };

  return (
    <nav className="bg-green-600 text-white shadow-md fixed bottom-0 w-full z-10">
      <div className="container mx-auto px-4">
        <div className="md:hidden flex justify-between items-center h-16">
          <Link to="/" className="flex items-center" onClick={closeMenu}>
            <span className="text-xl font-bold">PastaFinance</span>
          </Link>
          <button
            onClick={toggleMenu}
            className="p-2 focus:outline-none"
          >
            <svg
              className="h-6 w-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Menu mobile */}
        <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} pb-4`}>
          <div className="flex flex-col space-y-2">
            <Link
              to="/"
              className={`block px-4 py-2 rounded ${isActive('/')}`}
              onClick={closeMenu}
            >
              Dashboard
            </Link>
            <Link
              to="/vendas"
              className={`block px-4 py-2 rounded ${isActive('/vendas')}`}
              onClick={closeMenu}
            >
              Vendas
            </Link>
            <Link
              to="/gastos"
              className={`block px-4 py-2 rounded ${isActive('/gastos')}`}
              onClick={closeMenu}
            >
              Gastos
            </Link>
            <Link
              to="/relatorios"
              className={`block px-4 py-2 rounded ${isActive('/relatorios')}`}
              onClick={closeMenu}
            >
              Relatórios
            </Link>
            <button
              onClick={() => {
                closeMenu();
                onLogout();
              }}
              className="block px-4 py-2 text-left text-white hover:bg-green-700 rounded"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Bottom navbar para mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-green-600 flex justify-between items-center px-6 py-2 shadow-lg">
          <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/')} rounded`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Início</span>
          </Link>
          <Link to="/vendas" className={`flex flex-col items-center p-2 ${isActive('/vendas')} rounded`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">Vendas</span>
          </Link>
          <Link to="/gastos" className={`flex flex-col items-center p-2 ${isActive('/gastos')} rounded`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-xs">Gastos</span>
          </Link>
          <Link to="/relatorios" className={`flex flex-col items-center p-2 ${isActive('/relatorios')} rounded`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs">Relatórios</span>
          </Link>
        </div>

        {/* Menu desktop */}
        <div className="hidden md:flex md:justify-between md:items-center">
          <Link to="/" className="flex items-center py-4">
            <span className="text-xl font-bold">PastaFinance</span>
          </Link>
          <div className="flex space-x-4">
            <Link to="/" className={`px-4 py-2 rounded ${isActive('/')}`}>
              Dashboard
            </Link>
            <Link to="/vendas" className={`px-4 py-2 rounded ${isActive('/vendas')}`}>
              Vendas
            </Link>
            <Link to="/gastos" className={`px-4 py-2 rounded ${isActive('/gastos')}`}>
              Gastos
            </Link>
            <Link to="/relatorios" className={`px-4 py-2 rounded ${isActive('/relatorios')}`}>
              Relatórios
            </Link>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-white hover:bg-green-700 rounded"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

