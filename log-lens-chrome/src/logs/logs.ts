import '../ui/theme.css';
import '../ui/viewer.css';
import { $ } from '../ui/dom';
import { LogViewer } from '../ui/viewer';

document.title = 'Log Lens - Error Logs';
const viewer = new LogViewer($('#viewer-root'));
void viewer.init();
