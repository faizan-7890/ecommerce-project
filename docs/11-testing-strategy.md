# 11. Testing Strategy

## 11.1 Test Matrix
- **Unit & Integration Tests**: Verified via automated API test scripts (`scratch/api_check.py`) validating response status codes and JSON payload shapes.
- **TypeScript Type Safety**: Enforced via `npm run build` static type-checking pass (13/13 static pages compiled with zero errors).
- **Lighthouse / Web Vitals**: Verified image LCP optimization and dynamic `sizes` props.
