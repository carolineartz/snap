import { createRoot } from 'react-dom/client';
import { SnapViewer } from './SnapViewer';
import '../index.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<SnapViewer />);
