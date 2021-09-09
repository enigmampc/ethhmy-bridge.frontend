import { createGlobalStyle } from 'styled-components';
import { transparentize } from 'polished';

export const GlobalStyle = createGlobalStyle<any>`
  html {
  }
  
  body {
    color: #47b8eb;
    font-family: ${props => props.theme.fontBase || 'Nunito'};
    overflow-x: hidden;
    background-position: 0 100%;
    background-repeat: no-repeat;
    background-image: ${props => `radial-gradient(123.22% 129.67% at 100.89% -5.6%, #061222 0%, #061222 100%)`};
  }
`;
