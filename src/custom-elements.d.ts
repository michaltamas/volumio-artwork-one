// Volumio's MyVolumio directives are custom elements the theme's stylesheet addresses by name
import 'react';
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'my-volumio-avatar-image': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'my-volumio-current-plan-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'my-volumio-plan-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'my-volumio-back-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'my-volumio-device-selector': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'my-volumio-already-logged': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'my-volumio-verification-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'paddle-pay-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'ng-letter-avatar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
