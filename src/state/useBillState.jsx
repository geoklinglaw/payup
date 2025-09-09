import React, {
    createContext,
    useContext,
    useMemo,
    useReducer,
    useRef,
  } from 'react';
  
  const initial = {
    step: 0,
    contributors: [],
    bills: [],
    activeBillId: undefined,
    receiptItems: [],
    receiptMeta: { merchant: '', date: '', subtotal: 0, tax: 0, total: 0 },
  };
  
  function reducer(state, action) {
    switch (action.type) {
      case 'NEXT':
        return { ...state, step: Math.min(4, state.step + 1) };
      case 'PREV':
        return { ...state, step: Math.max(0, state.step - 1) };
      case 'GOTO':
        return { ...state, step: action.step };
      case 'ADD_CONTRIB': {
        const id = crypto.randomUUID();
        return { ...state, contributors: [...state.contributors, { id, name: action.name }] };
      }
      case 'REMOVE_CONTRIB':
        return { ...state, contributors: state.contributors.filter(c => c.id !== action.id) };
      case 'ADD_BILL':
        return { ...state, bills: [...state.bills, action.bill], activeBillId: action.bill.id };
      case 'SET_ACTIVE_BILL':
        return { ...state, activeBillId: action.id };
      case 'SET_RECEIPT_ITEMS':
        return { ...state, receiptItems: action.items };
      case 'SET_RECEIPT_META':
        return { ...state, receiptMeta: { ...state.receiptMeta, ...action.meta } };
      default:
        return state;
    }
  }
  
  const Ctx = createContext(null);
  
  export function BillProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initial);
  
    const extractHandlerRef = useRef(null);
    const setExtractHandler = (fn) => { extractHandlerRef.current = fn; };
    const callExtractHandler = () => {
        if (!extractHandlerRef.current) {
          return Promise.reject(new Error('No extract handler registered'))
        }
        return extractHandlerRef.current()
    }
      
  const saveHandlerRef = useRef(null)
  const setSaveHandler = (fn) => { saveHandlerRef.current = fn }
  const callSaveHandler = () => {
    if (!saveHandlerRef.current) {
      return Promise.reject(new Error('No save handler registered'))
    }
    return saveHandlerRef.current()
  }
      
    const computePairwise = () => {
      const idToName = Object.fromEntries(state.contributors.map(c => [c.id, c.name]));
      const map = new Map();
      state.bills.forEach(bill => {
        bill.items.forEach(item => {
          const share = item.price / Math.max(1, item.assignees.length);
          item.assignees.forEach(payerId => {
            if (payerId === bill.hostId) return;
            const key = `${payerId}->${bill.hostId}`;
            map.set(key, (map.get(key) || 0) + share);
          });
        });
      });
      return Array.from(map.entries())
        .filter(([, amt]) => amt > 0.009)
        .map(([key, amt]) => {
          const [payer, payee] = key.split('->');
          return `${idToName[payer]} pays ${idToName[payee]} $${amt.toFixed(2)}`;
        });
    };
  
    const value = useMemo(
      () => ({ state, dispatch, computePairwise, setExtractHandler, callExtractHandler, setSaveHandler, callSaveHandler }),
      [state]
    );
    console.log("value: ", value)
  
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }
  
  export function useBillState() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useBillState must be used inside <BillProvider>');
    return ctx;
  }
  