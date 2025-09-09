import React, {
    createContext,
    useContext,
    useMemo,
    useReducer,
    useRef,
  } from 'react';
  
  const initialState = () => ({
    step: 0,
    contributors: [],
    bills: [],
    activeBillId: undefined,
    receiptItems: [],
    receiptMeta: { merchant: '', date: '', subtotal: 0, tax: 0, total: 0 },
  });
  
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
      case 'RESET':
        return initialState();
      default:
        return state;
    }
  }
  
  const Ctx = createContext(null);
  
  export function BillProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, undefined, initialState);
  
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
    const everyoneIds = state.contributors.map(c => c.id);

    // accumulate across all bills: key = `${payerId}->${hostId}` -> amount
    const pairTotals = new Map();

    for (const bill of state.bills || []) {
      const hostId = bill?.hostId;
      const taxRate = Number(bill?.taxRate) || 0;
      const taxMultiplier = 1 + Math.max(0, taxRate) / 100;

      // per-person totals for THIS bill before tax
      const perPerson = new Map(); // payerId -> amount

      for (const item of bill?.items || []) {
        const unit = Number(item?.price) || 0;
        const qty = Number(item?.quantity) || 1;
        const line = unit * qty;
        if (!(line > 0)) continue;

        // fall back to "all" if assignees missing/empty
        let assignees = Array.isArray(item?.assignees) ? item.assignees.filter(Boolean) : [];
        if (assignees.length === 0) assignees = everyoneIds;

        const perShare = line / assignees.length;

        for (const pid of assignees) {
          perPerson.set(pid, (perPerson.get(pid) || 0) + perShare);
        }
      }

      // apply tax and push into global pair map (skip host paying host)
      for (const [pid, amt] of perPerson) {
        if (!pid || pid === hostId) continue;
        const owed = amt * taxMultiplier;
        if (owed <= 0.009) continue;

        const key = `${pid}->${hostId}`;
        pairTotals.set(key, (pairTotals.get(key) || 0) + owed);
      }
    }

    // format results
    return Array.from(pairTotals.entries())
      .filter(([, amt]) => amt > 0.009)
      .map(([key, amt]) => {
        const [payer, payee] = key.split('->');
        return `${idToName[payer] ?? 'Unknown'} pays ${idToName[payee] ?? 'Host'} $${amt.toFixed(2)}`;
      });
  };

    const resetAll = () => {
      extractHandlerRef.current = null;
      saveHandlerRef.current = null;
      dispatch({ type: 'RESET' });
    };
  
    const value = useMemo(
      () => ({ state, dispatch, computePairwise, setExtractHandler, callExtractHandler, setSaveHandler, callSaveHandler, resetAll }),
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
  