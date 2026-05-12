import { createRoot } from 'react-dom/client';
import '../index.css';
import { MenuApp } from '../components/context-menu/MenuApp';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(<MenuApp />);
