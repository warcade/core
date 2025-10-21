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
    // Menus removed for personal use

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