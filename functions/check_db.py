import firebase_admin
from firebase_admin import firestore

firebase_admin.initialize_app()
db = firestore.client()

user_id = None
users = db.collection('users').stream()
for u in users:
    if u.id != 'placeholder':
        user_id = u.id
        break

if user_id:
    print(f"User ID: {user_id}")
    txs = db.collection('users').document(user_id).collection('transactions').where('merchantName', '==', 'Wegmans').stream()
    for tx in txs:
        d = tx.to_dict()
        print(f"ID: {tx.id}, Date: {d.get('date')}, Amount: {d.get('amount')}, monarchAccountId: {d.get('monarchAccountId')}")
