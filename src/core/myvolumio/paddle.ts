/** Paddle's checkout (the frame's paddleService): the script from Paddle's CDN, set up with Volumio's vendor id. */
declare global { interface Window { Paddle?: any } }

const VENDOR = 29290;
let loading: Promise<any> | null = null;

export function paddle(): Promise<any> {
  if (window.Paddle) { return Promise.resolve(window.Paddle); }
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.async = true; s.src = 'https://cdn.paddle.com/paddle/paddle.js';
      s.addEventListener('load', () => { try { window.Paddle.Setup({ vendor: VENDOR, debug: false }); resolve(window.Paddle); } catch (e) { reject(e); } });
      s.addEventListener('error', () => reject(new Error('Error loading script.')));
      document.head.appendChild(s);
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
}

export function paddlePrices(productId: number): Promise<any> {
  return paddle().then(P => new Promise(resolve => P.Product.Prices(productId, resolve)));
}

export function paddleCheckout(props: Record<string, any>): Promise<void> {
  return paddle().then(P => { P.Checkout.open(props, false); });
}

export function paddleOverride(url: string): Promise<void> {
  return paddle().then(P => { P.Checkout.open({ override: url }); });
}
