import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import engine

def verify():
    with engine.connect() as conn:
        # Check tables
        res = conn.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        ).fetchall()
        tables = [r[0] for r in res]
        print("TABLES CREATED:")
        for t in tables:
            print(f"  - {t}")

        # Check constraints (pk, fk, unique, check)
        res_c = conn.execute(
            text(
                """
                SELECT conname, contype, conrelid::regclass::text as table_name
                FROM pg_constraint 
                WHERE connamespace = 'public'::regnamespace 
                ORDER BY table_name, conname;
                """
            )
        ).fetchall()
        print("\nCONSTRAINTS VERIFIED:")
        for name, ctype, tbl in res_c:
            type_label = {
                'p': 'PRIMARY KEY',
                'f': 'FOREIGN KEY',
                'u': 'UNIQUE',
                'c': 'CHECK',
            }.get(ctype, ctype)
            print(f"  - {tbl}.{name} [{type_label}]")

        # Check indexes
        res_i = conn.execute(
            text(
                """
                SELECT tablename, indexname 
                FROM pg_indexes 
                WHERE schemaname = 'public' 
                ORDER BY tablename, indexname;
                """
            )
        ).fetchall()
        print("\nINDEXES VERIFIED:")
        for tbl, idx in res_i:
            print(f"  - {tbl}.{idx}")

if __name__ == "__main__":
    verify()
