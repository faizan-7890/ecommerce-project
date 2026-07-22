# 14. Appendices & Environment Variables

## 14.1 Environment Variable References

### Backend (`.env.production.example`)
```ini
PORT=8000
NODE_ENV=production
DATABASE_URL=mysql+pymysql://user:pass@db-host:3306/veloce_db
FRONTEND_URL=https://veloce.yourdomain.com
CLERK_SECRET_KEY=sk_live_...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_secret
```

### Frontend (`.env.production.example`)
```ini
NEXT_PUBLIC_API_URL=https://api.veloce.yourdomain.com/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
```
