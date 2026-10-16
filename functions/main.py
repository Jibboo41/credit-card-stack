import os
import asyncio
from firebase_functions import scheduler_fn, https_fn, options
import firebase_admin
from firebase_admin import firestore, auth
from monarchmoney import MonarchMoney, RequireMFAException

# Initialize Firebase Admin
firebase_admin.initialize_app()
from datetime import datetime, timezone

# We initialize db lazily inside the function so the Firebase CLI can parse this file without needing GCP credentials

@scheduler_fn.on_schedule(
    schedule="every 24 hours",
    timezone=scheduler_fn.Timezone("America/New_York"),
    secrets=["MONARCH_EMAIL", "MONARCH_PASSWORD", "MONARCH_MFA_SECRET", "GEMINI_API_KEY"],
    timeout_sec=300
)
def sync_monarch(event: scheduler_fn.ScheduledEvent) -> None:
    """Cloud Function that syncs Monarch Money data daily."""
    asyncio.run(_sync_monarch())

@https_fn.on_call(
    secrets=["MONARCH_EMAIL", "MONARCH_PASSWORD", "MONARCH_MFA_SECRET", "GEMINI_API_KEY"],
    timeout_sec=300
)
def trigger_sync_monarch(req: https_fn.CallableRequest) -> any:
    """HTTP Callable to trigger sync manually."""
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="User must be authenticated to trigger sync."
        )
    asyncio.run(_sync_monarch())
    return {"status": "success"}

async def _sync_monarch():
    db = firestore.client()
    
    email = os.environ.get("MONARCH_EMAIL")
    password = os.environ.get("MONARCH_PASSWORD")
    mfa_secret = os.environ.get("MONARCH_MFA_SECRET")
    
    if not email or not password:
        print("Missing MONARCH_EMAIL or MONARCH_PASSWORD in secrets/env.")
        return
        
    mm = MonarchMoney()
    try:
        print("Logging into Monarch Money...")
        await mm.login(
            email=email,
            password=password,
            save_session=False,
            use_saved_session=False,
            mfa_secret_key=mfa_secret
        )
    except RequireMFAException:
        print("MFA required but secret key was invalid or missing.")
        return
    except Exception as e:
        print(f"Failed to login to Monarch: {e}")
        return

    print("Fetching accounts...")
    accounts_data = await mm.get_accounts()
    accounts = accounts_data.get('accounts', [])
    
    # Filter for credit cards based on account type
    credit_cards = [
        acc for acc in accounts 
        if acc.get('type', {}).get('name', '').lower().replace('_', ' ') in ['credit card', 'credit']
    ]
    
    target_email = "oneilltm@gmail.com"
    try:
        user = auth.get_user_by_email(target_email)
        user_uid = user.uid
        print(f"Found user UID for {target_email}: {user_uid}")
    except Exception as e:
        print(f"Could not find user with email {target_email}. Make sure you have signed in first. Error: {e}")
        return
        
    cards_ref = db.collection('users').document(user_uid).collection('creditCards')
    
    # Fetch existing mapped cards
    existing_cards = cards_ref.where('monarchId', '!=', '').stream()
    existing_map = {doc.to_dict().get('monarchId'): doc.id for doc in existing_cards if doc.to_dict().get('monarchId')}
    
    # Fetch all cards once to memory so we can match and mutate locally
    all_cards = [doc.to_dict() for doc in cards_ref.stream()]
    
    now_iso = datetime.now(timezone.utc).isoformat()
    
    for acc in credit_cards:
        monarch_id = acc.get('id')
        name = acc.get('displayName')
        balance = acc.get('currentBalance')
        mask = acc.get('mask')
        
        doc_id = existing_map.get(monarch_id)
        if doc_id:
            print(f"Updating existing mapped card: {name}")
            update_data = {
                'currentBalance': balance,
                'lastSyncedAt': now_iso
            }
            if mask:
                update_data['lastFourDigits'] = mask
            cards_ref.document(doc_id).update(update_data)
        else:
            # Try to loosely match against an existing unmapped card
            matched_id = None
            for c_data in all_cards:
                if c_data.get('monarchId'):
                    continue # already mapped
                
                # Match by mask
                if mask and c_data.get('lastFourDigits') == mask:
                    matched_id = c_data.get('id')
                    break
                    
                # Match by name overlap
                c_name = c_data.get('name', '').lower()
                if c_name and (name.lower() in c_name or c_name in name.lower()):
                    matched_id = c_data.get('id')
                    break
            
            if matched_id:
                print(f"Matched unmapped card {name} to existing document {matched_id}")
                update_data = {
                    'monarchId': monarch_id,
                    'currentBalance': balance,
                    'lastSyncedAt': now_iso
                }
                if mask:
                    update_data['lastFourDigits'] = mask
                cards_ref.document(matched_id).update(update_data)
                
                # Update our in-memory list so we don't match it again
                for c_data in all_cards:
                    if c_data.get('id') == matched_id:
                        c_data['monarchId'] = monarch_id
            else:
                print(f"Creating new card from Monarch: {name}")
                new_doc = cards_ref.document()
                new_card = {
                    'id': new_doc.id,
                    'name': name,
                    'monarchId': monarch_id,
                    'currentBalance': balance,
                    'lastFourDigits': mask or '',
                    'categories': [],
                    'cashback': {},
                    'noForeignTxFee': False,
                    'specialOffers': '',
                    'notes': 'Automatically synced from Monarch Money',
                    'lastSyncedAt': now_iso
                }
                new_doc.set(new_card)

    # Sync Transactions using Gemini AI
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            from google import genai
            from pydantic import BaseModel
            from typing import List, Literal
            import json
            from datetime import timedelta
            
            FinanceCategory = Literal['Car Rental', 'Flights', 'Gas', 'Dining', 'Lodging', 'Souvenirs', 'Groceries', 'Online Shopping', 'Streaming Services', 'Utility Bills', 'Other']
            
            class CategorizedTransaction(BaseModel):
                id: str
                category: FinanceCategory
                
            class CategorizedTransactionList(BaseModel):
                transactions: List[CategorizedTransaction]
                
            client = genai.Client(api_key=gemini_key)
            start_date = (datetime.now() - timedelta(days=30)).isoformat()[:10]
            
            monarch_accounts = []
            for doc in cards_ref.stream():
                d = doc.to_dict()
                if d.get('monarchId'):
                    monarch_accounts.append({'id': d.get('monarchId'), 'name': d.get('name', 'Unknown')})
            monarch_ids = [acc['id'] for acc in monarch_accounts]
            accounts_synced_details = [acc['name'] for acc in monarch_accounts]
            
            log_data = {
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "accountsSynced": len(monarch_ids),
                "accountsSyncedDetails": accounts_synced_details,
                "transactionsFetched": 0,
                "transactionsFetchedDetails": [],
                "transactionsCategorized": 0,
                "transactionsCategorizedDetails": [],
                "orphansDeleted": 0,
                "orphansDeletedDetails": [],
                "errorDetails": None
            }
            
            if monarch_ids:
                end_date = datetime.now().isoformat()[:10]
                print(f"Fetching transactions for {len(monarch_ids)} accounts since {start_date} to {end_date}...")
                tx_response = await mm.get_transactions(start_date=start_date, end_date=end_date, account_ids=monarch_ids, limit=1000)
                
                # Check response structure
                if 'allTransactions' in tx_response and 'results' in tx_response['allTransactions']:
                    transactions = tx_response['allTransactions']['results']
                else:
                    transactions = tx_response.get('allTransactions', {}).get('results', [])
                
                print(f"Fetched {len(transactions)} transactions.")
                log_data["transactionsFetched"] = len(transactions)
                
                transactions_fetched_details = []
                for tx in transactions:
                    merchant = tx.get("merchant", {}).get("name") if tx.get("merchant") else tx.get("dataProviderDescription", "Unknown")
                    amt = tx.get("amount")
                    transactions_fetched_details.append(f"{merchant} (${amt})")
                log_data["transactionsFetchedDetails"] = transactions_fetched_details
                
                if transactions:
                    tx_batch = []
                    for tx in transactions:
                        merchant = tx.get("merchant", {}).get("name") if tx.get("merchant") else tx.get("dataProviderDescription", "Unknown")
                        tx_batch.append({
                            "id": tx.get("id"),
                            "merchant": merchant,
                            "amount": tx.get("amount"),
                            "originalCategory": tx.get("category", {}).get("name") if tx.get("category") else None
                        })
                        
                    try:
                        print("Categorizing with Gemini...")
                        prompt = "Categorize the following credit card transactions. Follow the strict FinanceCategory schema."
                        prompt += json.dumps(tx_batch)
                        
                        response = client.models.generate_content(
                            model='gemini-2.5-flash',
                            contents=prompt,
                            config={
                                'response_mime_type': 'application/json',
                                'response_schema': CategorizedTransactionList,
                            },
                        )
                        parsed_cats = response.parsed
                        cat_map = {item.id: item.category for item in parsed_cats.transactions}
                    except Exception as gemini_err:
                        print(f"Warning: Gemini categorization failed ({gemini_err}). Proceeding with un-categorized transactions.")
                        cat_map = {}
                        log_data["status"] = "partial"
                        log_data["errorDetails"] = f"Gemini categorization failed: {gemini_err}"
                    
                    transactions_categorized_details = []
                    for tx_id, cat in cat_map.items():
                        tx = next((t for t in transactions if t.get("id") == tx_id), None)
                        if tx:
                            merchant = tx.get("merchant", {}).get("name") if tx.get("merchant") else tx.get("dataProviderDescription", "Unknown")
                            transactions_categorized_details.append(f"{merchant} -> {cat}")
                    log_data["transactionsCategorizedDetails"] = transactions_categorized_details
                    log_data["transactionsCategorized"] = len(cat_map)
                    
                    trans_ref = db.collection('users').document(user_uid).collection('transactions')
                    batch = db.batch()
                    batch_count = 0
                    
                    monarch_tx_ids = {tx.get("id") for tx in transactions}
                    
                    # Delete orphaned transactions (e.g. pending -> posted)
                    existing_txs = trans_ref.where('date', '>=', start_date).stream()
                    deleted_count = 0
                    existing_cats = {}
                    
                    orphans_deleted_details = []
                    for doc in existing_txs:
                        doc_data = doc.to_dict()
                        if doc_data.get('monarchAccountId') in monarch_ids:
                            existing_cats[doc.id] = doc_data.get('category')
                            if doc.id not in monarch_tx_ids:
                                batch.delete(doc.reference)
                                merchant = doc_data.get('merchantName', 'Unknown')
                                amt = doc_data.get('amount', 0)
                                date = doc_data.get('date', 'Unknown')
                                orphans_deleted_details.append(f"{merchant} (${amt}) on {date}")
                                batch_count += 1
                                deleted_count += 1
                                if batch_count == 400:
                                    batch.commit()
                                    batch = db.batch()
                                    batch_count = 0

                    for tx in transactions:
                        tx_id = tx.get("id")
                        merchant = tx.get("merchant", {}).get("name") if tx.get("merchant") else tx.get("dataProviderDescription", "Unknown")
                        cat = cat_map.get(tx_id)
                        if not cat:
                            cat = existing_cats.get(tx_id, "Other")
                        
                        doc_ref = trans_ref.document(tx_id)
                        batch.set(doc_ref, {
                            "id": tx_id,
                            "monarchAccountId": tx.get("account", {}).get("id"),
                            "date": tx.get("date"),
                            "amount": tx.get("amount"),
                            "merchantName": merchant,
                            "category": cat,
                            "originalCategory": tx.get("category", {}).get("name") if tx.get("category") else None
                        }, merge=True)
                        
                        batch_count += 1
                        if batch_count == 400:
                            batch.commit()
                            batch = db.batch()
                            batch_count = 0
                            
                    if batch_count > 0:
                        batch.commit()
                        
                    log_data["orphansDeleted"] = deleted_count
                    log_data["orphansDeletedDetails"] = orphans_deleted_details
                    print(f"Successfully processed and stored {len(transactions)} categorized transactions. Deleted {deleted_count} orphaned transactions.")
                    
            # Write sync log
            log_ref = db.collection('users').document(user_uid).collection('syncLogs').document()
            log_data["id"] = log_ref.id
            log_ref.set(log_data)
            
        except Exception as e:
            print(f"Error syncing transactions: {e}")
            import traceback
            traceback.print_exc()
            
            try:
                log_ref = db.collection('users').document(user_uid).collection('syncLogs').document()
                log_ref.set({
                    "id": log_ref.id,
                    "timestamp": datetime.now().isoformat(),
                    "status": "error",
                    "accountsSynced": len(monarch_ids) if 'monarch_ids' in locals() else 0,
                    "transactionsFetched": 0,
                    "transactionsCategorized": 0,
                    "orphansDeleted": 0,
                    "errorDetails": str(e)
                })
            except Exception as inner_e:
                print(f"Failed to write error log: {inner_e}")
                
    else:
        print("Skipping transaction categorization because GEMINI_API_KEY is not set.")

    print("✅ Sync complete!")
