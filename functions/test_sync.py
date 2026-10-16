import asyncio
from monarchmoney import MonarchMoney
import os
import firebase_admin
from firebase_admin import firestore

firebase_admin.initialize_app()
db = firestore.client()

async def run():
    mm = MonarchMoney()
    email = os.environ.get("MONARCH_EMAIL")
    password = os.environ.get("MONARCH_PASSWORD")
    mfa = os.environ.get("MONARCH_MFA_SECRET")
    
    await mm.login(email=email, password=password, mfa_secret_key=mfa)
    
    start_date = '2026-06-05'
    end_date = '2026-07-06'
    
    print("getting txs from monarch...")
    res = await mm.get_transactions(start_date=start_date, end_date=end_date)
    
    if 'allTransactions' in res and 'results' in res['allTransactions']:
        txs = res['allTransactions']['results']
    else:
        txs = res.get('allTransactions', {}).get('results', [])
        
    print(f"Monarch tx count: {len(txs)}")
    wegmans = [tx for tx in txs if 'Wegmans' in tx.get('merchant', {}).get('name', '') or 'Wegmans' in tx.get('dataProviderDescription', '')]
    print("Wegmans txs in Monarch:")
    for w in wegmans:
        print(f"ID: {w.get('id')}, Date: {w.get('date')}, Amount: {w.get('amount')}, Status: pending={w.get('isPending')}")
        
if __name__ == '__main__':
    asyncio.run(run())
