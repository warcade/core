import { createPlugin } from '@/api/plugin';
import { createSignal } from 'solid-js';
import { IconRefresh, IconVideo, IconEdit, IconArrowLeft, IconArrowRight, IconPlus, IconFolder, IconFile, IconArrowDown, IconScissors, IconCopy, IconClipboard, IconTrash, IconCube, IconWorld, IconBox, IconCircle, IconCylinder, IconSquare, IconChairDirector, IconLink, IconHelp, IconHeadphones, IconBrandYoutube, IconBrandDiscord, IconBook, IconInfoCircle, IconDeviceFloppy, IconMountain, IconSun, IconBulb, IconSphere, IconPackage, IconSettings, IconEye, IconRobot, IconBrain, IconMessage, IconX
} from '@tabler/icons-solidjs';
import AboutOverlay from './AboutOverlay.jsx';
import { editorActions } from '@/layout/stores/EditorStore';

const [showAbout, setShowAbout] = createSignal(false);
const [showOpenProject, setShowOpenProject] = createSignal(false);



const handleNewProject = async () => {
};

const handleOpenProject = async () => {
  setShowOpenProject(true);
};

const handleProjectSelect = async (project) => {
  alert('Project switching is currently unavailable. The project API has been removed.');
};


export default createPlugin({
  id: 'menu-plugin',
  name: 'Menu Plugin',
  version: '1.0.0',
  description: 'Core application menu items',
  author: 'Renzora Engine Team',

  async onInit() {

  },

  async onStart(api) {

    api.menu('file', {
      label: 'File',
      icon: IconFile,
      order: 1,
      submenu: [
        { 
          id: 'new', 
          label: 'New Project', 
          icon: IconPlus,
          action: handleNewProject
        },
        { 
          id: 'open', 
          label: 'Open Project', 
          icon: IconFolder, 
          shortcut: 'Ctrl+O',
          action: handleOpenProject
        },
        { divider: true },
        { 
          id: 'save', 
          label: 'Save', 
          icon: IconDeviceFloppy,
          shortcut: 'Ctrl+S',
          action: () => editorActions.addConsoleMessage('Save functionality', 'info')
        },
        { 
          id: 'save-as', 
          label: 'Save As...', 
          icon: IconDeviceFloppy,
          shortcut: 'Ctrl+Shift+S',
          action: () => editorActions.addConsoleMessage('Save As functionality', 'info')
        },
        { divider: true },
        { 
          id: 'import', 
          label: 'Import', 
          icon: IconArrowDown,
          action: () => editorActions.addConsoleMessage('Import functionality', 'info')
        },
        { 
          id: 'export', 
          label: 'Export', 
          icon: IconArrowDown,
          action: () => editorActions.addConsoleMessage('Export functionality', 'info')
        },
        { divider: true },
        { id: 'recent', label: 'Recent Projects', icon: IconRefresh },
        {
          id: 'close-project',
          label: 'Close Project',
          icon: IconX,
          action: async () => {
            editorActions.addConsoleMessage('Project operations are currently unavailable', 'warning');
          }
        },
      ],
      onClick: () => {

      }
    });

    api.menu('edit', {
      label: 'Edit',
      icon: IconEdit,
      order: 2,
      submenu: [
        { 
          id: 'undo', 
          label: 'Undo', 
          icon: IconArrowLeft, 
          shortcut: 'Ctrl+Z',
          action: () => editorActions.addConsoleMessage('Undo action', 'info')
        },
        { 
          id: 'redo', 
          label: 'Redo', 
          icon: IconArrowRight, 
          shortcut: 'Ctrl+Y',
          action: () => editorActions.addConsoleMessage('Redo action', 'info')
        },
        { divider: true },
        { 
          id: 'cut', 
          label: 'Cut', 
          icon: IconScissors, 
          shortcut: 'Ctrl+X',
          action: () => editorActions.addConsoleMessage('Cut action', 'info')
        },
        { 
          id: 'copy', 
          label: 'Copy', 
          icon: IconCopy, 
          shortcut: 'Ctrl+C',
          action: () => editorActions.addConsoleMessage('Copy action', 'info')
        },
        { 
          id: 'paste', 
          label: 'Paste', 
          icon: IconClipboard, 
          shortcut: 'Ctrl+V',
          action: () => editorActions.addConsoleMessage('Paste action', 'info')
        },
        { 
          id: 'duplicate', 
          label: 'Duplicate', 
          icon: IconCopy, 
          shortcut: 'Ctrl+D',
          action: () => editorActions.addConsoleMessage('Duplicate action', 'info')
        },
        { 
          id: 'delete', 
          label: 'Delete', 
          icon: IconTrash, 
          shortcut: 'Delete',
          action: () => editorActions.addConsoleMessage('Delete action', 'info')
        },
        { divider: true },
        { 
          id: 'select-all', 
          label: 'Select All', 
          shortcut: 'Ctrl+A',
          action: () => editorActions.addConsoleMessage('Select All action', 'info')
        },
        { 
          id: 'preferences', 
          label: 'Preferences', 
          icon: IconSettings,
          shortcut: 'Ctrl+,',
          action: () => editorActions.addConsoleMessage('Opening preferences', 'info')
        },
      ],
      onClick: () => {

      }
    });


    api.menu('help', {
      label: 'Help',
      icon: IconHelp,
      order: 6,
      submenu: [
        { id: 'help-documentation', label: 'Documentation', icon: IconBook },
        { id: 'help-about', label: 'About', icon: IconInfoCircle, 
          action: () => setShowAbout(true) }
      ]
    });

    api.registerLayoutComponent('about-overlay', () => {
      return (
        <AboutOverlay 
          isOpen={showAbout} 
          onClose={() => setShowAbout(false)} 
        />
      );
    });
    
    
  }
});