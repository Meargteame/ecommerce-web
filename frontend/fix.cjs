const fs = require('fs');
let content = fs.readFileSync('/home/meareg/client-projects/ecommerce-web/frontend/app/account/billing/page.tsx', 'utf8');
content = content.replace(/\\\$/g, '$').replace(/\\`/g, '`');
fs.writeFileSync('/home/meareg/client-projects/ecommerce-web/frontend/app/account/billing/page.tsx', content);

let b_content = fs.readFileSync('/home/meareg/client-projects/ecommerce-web/backend/src/routes/paymentMethodRoutes.ts', 'utf8');
b_content = b_content.replace(/\\\$/g, '$').replace(/\\`/g, '`');
fs.writeFileSync('/home/meareg/client-projects/ecommerce-web/backend/src/routes/paymentMethodRoutes.ts', b_content);
