import { createRoot } from 'react-dom/client';
import '../index.css';
import { LibraryApp } from '../components/library/LibraryApp';

// Activates the rounded-window CSS clip — see index.css.
document.documentElement.classList.add('library-window');

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<LibraryApp />);
