import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import DiceRoller from "@/components/dice/DiceRoller";

const DICE_CONFIG = {
  d4: { sides: 4, scale: 1.3 },
  d6: { sides: 6, scale: 1.5 },
  d8: { sides: 8, scale: 1.3 },
  d10: { sides: 10, scale: 1.2 },
  d12: { sides: 12, scale: 1.2 },
  d20: { sides: 20, scale: 1.3 },
};

const DEFAULT_MODEL_URLS = {
  d4: "https://static.wixstatic.com/3d/5cdfd8_b214bc92631744fb8844e01f137fe8f1.glb",
  d6: "https://static.wixstatic.com/3d/5cdfd8_902061e7b0ba49de98cbcf4eee049abe.glb",
  d8: "https://static.wixstatic.com/3d/5cdfd8_e70348801f264dd29f1a7628cee96ab7.glb",
  d10: "https://static.wixstatic.com/3d/5cdfd8_56bfac3a10e1410ab3432753f17e298f.glb",
  d12: "https://static.wixstatic.com/3d/5cdfd8_ffd61fa574db4f3e89b431d00113f7fc.glb",
  d20: "https://static.wixstatic.com/3d/5cdfd8_a58fd5d20a094dd889d89ec836133320.glb",
};

export default function DiceCalibrator() {
  const mountRef = useRef(null);
  const diceRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const [diceType, setDiceType] = useState("d6");
  const [face, setFace] = useState(1);
  const [rotationDisplay, setRotationDisplay] = useState({ x: 0, y: 0, z: 0 });
  const [positionY, setPositionY] = useState(0);
  const [positionX, setPositionX] = useState(0);
  const [modelTransforms, setModelTransforms] = useState({}); // { d6: { x: 0, y: 0 }, ... }
  const [savedFaces, setSavedFaces] = useState({});
  const [customModels, setCustomModels] = useState({});
  const [customModelFiles, setCustomModelFiles] = useState({});
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isSavingToApp, setIsSavingToApp] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [profileColors, setProfileColors] = useState({ primary: "#FF5722", secondary: "#8B5CF6" });
  const diceRollerRef = useRef(null);

  // Testing Controls
  const [testResult, setTestResult] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  
  const handleTestRoll = () => {
    if (diceRollerRef.current) {
      diceRollerRef.current.roll();
    }
  };

  // Fetch user profile colors
  useEffect(() => {
    const fetchColors = async () => {
      const user = await base44.auth.me();
      if (user) {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setProfileColors({
            primary: profiles[0].profile_color_1 || "#FF5722",
            secondary: profiles[0].profile_color_2 || "#8B5CF6"
          });
        }
      }
    };
    fetchColors();
  }, []);

  // Fetch campaigns for saving config
  useEffect(() => {
    base44.entities.Campaign.list().then(campaigns => {
      setCampaigns(campaigns);
      if (campaigns.length > 0) setSelectedCampaignId(campaigns[0].id);
    });
  }, []);

  // Load default model if no custom model exists for type
  useEffect(() => {
    if (!customModels[diceType] && DEFAULT_MODEL_URLS[diceType]) {
      setIsLoadingModel(true);
      const loader = new GLTFLoader();
      loader.load(
        DEFAULT_MODEL_URLS[diceType],
        (gltf) => {
          setCustomModels(prev => ({ ...prev, [diceType]: gltf }));
          setIsLoadingModel(false);
        },
        undefined,
        (err) => {
          console.error("Failed to load default model", err);
          setIsLoadingModel(false);
        }
      );
    }
  }, [diceType, customModels]);

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('diceConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.faceRotations) {
        // Convert saved rotations back to savedFaces format
        const faces = {};
        Object.entries(config.faceRotations).forEach(([type, rotations]) => {
          Object.entries(rotations).forEach(([faceNum, rot]) => {
            faces[`${type}_${faceNum}`] = rot;
          });
        });
        setSavedFaces(faces);
      }
    }
  }, []);

  // Create stylized iridescent face texture
  const createFaceTexture = (number, isTriangle = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Blue/purple iridescent gradient background
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.2, '#16213e');
    gradient.addColorStop(0.4, '#0f3460');
    gradient.addColorStop(0.6, '#1e5f74');
    gradient.addColorStop(0.8, '#133b5c');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add starry/crystalline sparkle effect
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.5 + 0.2;
      const colors = ['rgba(0, 255, 255,', 'rgba(100, 200, 255,', 'rgba(180, 100, 255,', 'rgba(255, 255, 255,'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillStyle = `${color}${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Subtle edge glow
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 492);
    
    // Rose gold number with metallic effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    const numberGradient = ctx.createLinearGradient(150, 100, 350, 400);
    numberGradient.addColorStop(0, '#e8b4b8');
    numberGradient.addColorStop(0.3, '#daa06d');
    numberGradient.addColorStop(0.5, '#cd7f32');
    numberGradient.addColorStop(0.7, '#b87333');
    numberGradient.addColorStop(1, '#e8b4b8');
    
    ctx.fillStyle = numberGradient;
    const fontSize = number >= 10 ? 200 : 260;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Adjust position for triangular faces
    const yPos = isTriangle ? 300 : 270;
    ctx.fillText(String(number), 256, yPos);
    
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 220, 200, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeText(String(number), 254, yPos - 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Create number sprite for polyhedra faces
  const createNumberSprite = (number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Transparent background
    ctx.clearRect(0, 0, 128, 128);
    
    // Rose gold number
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    const gradient = ctx.createLinearGradient(30, 20, 100, 100);
    gradient.addColorStop(0, '#e8b4b8');
    gradient.addColorStop(0.3, '#daa06d');
    gradient.addColorStop(0.5, '#cd7f32');
    gradient.addColorStop(0.7, '#b87333');
    gradient.addColorStop(1, '#e8b4b8');
    
    ctx.fillStyle = gradient;
    const fontSize = number >= 10 ? 60 : 80;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    return sprite;
  };

  // Get face centers for different geometries
  const getFaceCenters = (geometry, type) => {
    const positions = geometry.attributes.position;
    const centers = [];
    
    if (type === 'd4') {
      // Tetrahedron: 4 faces, 3 vertices each
      for (let i = 0; i < 4; i++) {
        const idx = i * 3;
        const v1 = new THREE.Vector3(positions.getX(idx), positions.getY(idx), positions.getZ(idx));
        const v2 = new THREE.Vector3(positions.getX(idx + 1), positions.getY(idx + 1), positions.getZ(idx + 1));
        const v3 = new THREE.Vector3(positions.getX(idx + 2), positions.getY(idx + 2), positions.getZ(idx + 2));
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        centers.push(center.normalize().multiplyScalar(0.6));
      }
    } else if (type === 'd8') {
      // Octahedron: 8 faces
      for (let i = 0; i < 8; i++) {
        const idx = i * 3;
        const v1 = new THREE.Vector3(positions.getX(idx), positions.getY(idx), positions.getZ(idx));
        const v2 = new THREE.Vector3(positions.getX(idx + 1), positions.getY(idx + 1), positions.getZ(idx + 1));
        const v3 = new THREE.Vector3(positions.getX(idx + 2), positions.getY(idx + 2), positions.getZ(idx + 2));
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        centers.push(center.normalize().multiplyScalar(0.85));
      }
    } else if (type === 'd10' || type === 'd12') {
      // Dodecahedron: 12 faces (pentagon = 3 triangles each = 36 triangles total for d12)
      // For simplicity, sample unique face normals
      const normals = [];
      const faceCount = type === 'd10' ? 10 : 12;
      for (let i = 0; i < positions.count; i += 3) {
        const v1 = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
        const v2 = new THREE.Vector3(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
        const v3 = new THREE.Vector3(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2));
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        const normal = center.clone().normalize();
        
        // Check if this normal is unique (not already added)
        let isUnique = true;
        for (const n of normals) {
          if (n.distanceTo(normal) < 0.1) {
            isUnique = false;
            break;
          }
        }
        if (isUnique && normals.length < faceCount) {
          normals.push(normal);
          centers.push(normal.clone().multiplyScalar(0.9));
        }
      }
    } else if (type === 'd20') {
      // Icosahedron: 20 faces
      for (let i = 0; i < 20; i++) {
        const idx = i * 3;
        const v1 = new THREE.Vector3(positions.getX(idx), positions.getY(idx), positions.getZ(idx));
        const v2 = new THREE.Vector3(positions.getX(idx + 1), positions.getY(idx + 1), positions.getZ(idx + 1));
        const v3 = new THREE.Vector3(positions.getX(idx + 2), positions.getY(idx + 2), positions.getZ(idx + 2));
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        centers.push(center.normalize().multiplyScalar(0.95));
      }
    }
    
    return centers;
  };

  // Base iridescent material for all dice
  const createBaseMaterial = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Blue/purple iridescent gradient
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.2, '#16213e');
    gradient.addColorStop(0.4, '#0f3460');
    gradient.addColorStop(0.6, '#1e5f74');
    gradient.addColorStop(0.8, '#133b5c');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Sparkles
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3 + 1;
      const alpha = Math.random() * 0.6 + 0.2;
      const colors = ['rgba(0, 255, 255,', 'rgba(100, 200, 255,', 'rgba(180, 100, 255,', 'rgba(255, 255, 255,'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillStyle = `${color}${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.7,
      roughness: 0.3,
      flatShading: true
    });
  };

  // Load custom GLB model
  const loadCustomModel = async (file, type) => {
    setIsLoadingModel(true);
    const loader = new GLTFLoader();
    const url = URL.createObjectURL(file);
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      
      // Store the model
      setCustomModels(prev => ({ ...prev, [type]: gltf }));
      
      // Replace the current dice with the loaded model
      if (sceneRef.current && diceRef.current) {
        sceneRef.current.remove(diceRef.current);
        
        const model = gltf.scene.clone();
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        
        // Scale to fit
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);
        
        // Center the model
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        sceneRef.current.add(model);
        diceRef.current = model;
        updateRotationDisplay();
      }
    } catch (error) {
      console.error("Error loading model:", error);
      alert("Failed to load model: " + error.message);
    } finally {
      setIsLoadingModel(false);
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
      loadCustomModel(file, diceType);
      // Store the file for later saving
      setCustomModelFiles(prev => ({ ...prev, [diceType]: file }));
    } else {
      alert("Please upload a .glb or .gltf file");
    }
    e.target.value = ''; // Reset input
  };

  // Save models to app (upload and store in localStorage for DiceRoller3D)
  const saveModelsToApp = async () => {
    if (Object.keys(customModelFiles).length === 0 && Object.keys(savedFaces).length === 0) {
      toast.error("No models or face rotations to save");
      return;
    }

    setIsSavingToApp(true);
    try {
      // Upload each custom model file
      const uploadedModels = {};
      for (const [type, file] of Object.entries(customModelFiles)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedModels[type] = file_url;
        toast.success(`Uploaded ${type.toUpperCase()} model`);
      }

      // Generate the faceRotations
      const allFaceRotations = {};
      Object.entries(savedFaces).forEach(([key, rotation]) => {
        const [type, faceNum] = key.split('_');
        if (!allFaceRotations[type]) allFaceRotations[type] = {};
        allFaceRotations[type][faceNum] = rotation;
      });

      // Merge with existing config
      const existingConfig = JSON.parse(localStorage.getItem('diceConfig') || '{}');
      const configOutput = {
        uploadedModels: { ...existingConfig.uploadedModels, ...uploadedModels },
        faceRotations: { ...existingConfig.faceRotations, ...allFaceRotations },
        modelTransforms: { ...existingConfig.modelTransforms, ...modelTransforms }
      };

      // Save to localStorage so DiceRoller3D can use it locally
      localStorage.setItem('diceConfig', JSON.stringify(configOutput));

      // Save to Campaign if selected
      if (selectedCampaignId) {
        await base44.entities.Campaign.update(selectedCampaignId, {
          dice_config: configOutput
        });
        toast.success("Models saved to campaign! Everyone will see them.");
      } else {
        toast.success("Dice configuration saved locally!");
      }
      
      console.log("Dice Configuration saved:", configOutput);
      
    } catch (error) {
      console.error("Error saving to app:", error);
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSavingToApp(false);
    }
  };

  const createDiceMesh = (type) => {
    const config = DICE_CONFIG[type];
    let geometry;
    let materials;
    let mesh;
    
    switch (type) {
      case 'd6': {
        geometry = new THREE.BoxGeometry(config.scale, config.scale, config.scale);
        const faceNumbers = [1, 6, 5, 2, 3, 4];
        materials = faceNumbers.map(num => 
          new THREE.MeshStandardMaterial({
            map: createFaceTexture(num),
            metalness: 0.7,
            roughness: 0.3
          })
        );
        mesh = new THREE.Mesh(geometry, materials);
        break;
      }
      case 'd4': {
        geometry = new THREE.TetrahedronGeometry(config.scale);
        materials = createBaseMaterial();
        mesh = new THREE.Mesh(geometry, materials);
        
        // Add number sprites
        const centers = getFaceCenters(geometry, type);
        centers.forEach((center, i) => {
          const sprite = createNumberSprite(i + 1);
          sprite.position.copy(center);
          sprite.scale.set(0.4, 0.4, 1);
          mesh.add(sprite);
        });
        break;
      }
      case 'd8': {
        geometry = new THREE.OctahedronGeometry(config.scale);
        materials = createBaseMaterial();
        mesh = new THREE.Mesh(geometry, materials);
        
        const centers = getFaceCenters(geometry, type);
        centers.forEach((center, i) => {
          const sprite = createNumberSprite(i + 1);
          sprite.position.copy(center);
          sprite.scale.set(0.35, 0.35, 1);
          mesh.add(sprite);
        });
        break;
      }
      case 'd10': {
        geometry = new THREE.DodecahedronGeometry(config.scale);
        materials = createBaseMaterial();
        mesh = new THREE.Mesh(geometry, materials);
        
        const centers = getFaceCenters(geometry, type);
        // D10 uses 0-9
        centers.slice(0, 10).forEach((center, i) => {
          const sprite = createNumberSprite(i);
          sprite.position.copy(center);
          sprite.scale.set(0.3, 0.3, 1);
          mesh.add(sprite);
        });
        break;
      }
      case 'd12': {
        geometry = new THREE.DodecahedronGeometry(config.scale);
        materials = createBaseMaterial();
        mesh = new THREE.Mesh(geometry, materials);
        
        const centers = getFaceCenters(geometry, type);
        centers.forEach((center, i) => {
          const sprite = createNumberSprite(i + 1);
          sprite.position.copy(center);
          sprite.scale.set(0.3, 0.3, 1);
          mesh.add(sprite);
        });
        break;
      }
      case 'd20': {
        geometry = new THREE.IcosahedronGeometry(config.scale);
        materials = createBaseMaterial();
        mesh = new THREE.Mesh(geometry, materials);
        
        const centers = getFaceCenters(geometry, type);
        centers.forEach((center, i) => {
          const sprite = createNumberSprite(i + 1);
          sprite.position.copy(center);
          sprite.scale.set(0.28, 0.28, 1);
          mesh.add(sprite);
        });
        break;
      }
      default:
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        materials = new THREE.MeshStandardMaterial({ color: 0xFF5722 });
        mesh = new THREE.Mesh(geometry, materials);
    }
    
    // Add edge wireframe for visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x37F2D1, linewidth: 1, transparent: true, opacity: 0.5 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(wireframe);
    
    return mesh;
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 300;
    const height = mount.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111119");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    // Lighting - tinted based on profile
    const pColor = new THREE.Color(profileColors.primary);
    const sColor = new THREE.Color(profileColors.secondary);

    const ambient = new THREE.AmbientLight(sColor, 0.6);
    scene.add(ambient);
    
    const dir = new THREE.DirectionalLight(pColor, 2.0);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // Tinted fill lights - extra vibrant
    const fill1 = new THREE.DirectionalLight(pColor, 5.0);
    fill1.position.set(-4, 3, 4);
    scene.add(fill1);

    const fill2 = new THREE.DirectionalLight(sColor, 5.0);
    fill2.position.set(4, 3, -4);
    scene.add(fill2);
    
    // Store lights reference for updates
    scene.userData = { fill1, fill2, ambient, dir };

    // Create initial dice
    const mesh = createDiceMesh(diceType);
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    scene.add(mesh);
    diceRef.current = mesh;

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 300;
      const h = mountRef.current.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    // Mouse drag to rotate
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current || !diceRef.current) return;
      
      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;
      
      // Rotate dice based on mouse movement
      diceRef.current.rotation.y += deltaX * 0.01;
      diceRef.current.rotation.x += deltaY * 0.01;
      
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
      updateRotationDisplay();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Scroll to zoom
    const onWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const newZ = camera.position.z + e.deltaY * zoomSpeed * camera.position.z;
      // Clamp zoom between 2 and 10
      camera.position.z = Math.max(2, Math.min(10, newZ));
      camera.position.x = camera.position.z;
      camera.position.y = camera.position.z;
      camera.lookAt(0, 0, 0);
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mouseleave", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("mouseleave", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update dice when type changes
  useEffect(() => {
    if (!sceneRef.current || !diceRef.current) return;
    
    sceneRef.current.remove(diceRef.current);
    
    // Check if we have a custom model for this dice type
    if (customModels[diceType]) {
      const model = customModels[diceType].scene.clone();
      
      // Apply saved transforms if any, or reset
      const transform = modelTransforms[diceType] || { x: 0, y: 0 };
      setPositionX(transform.x);
      setPositionY(transform.y);
      
      model.position.set(transform.x, transform.y, 0);
      model.rotation.set(0, 0, 0);
      
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.setScalar(scale);
      
      // Only auto-center if no manual transform exists (initial load)
      // Actually, we should always auto-center geometry relative to 0,0,0 
      // and then apply the manual offset.
      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center); // Center geometry
      
      // Re-apply manual offset
      model.position.x += transform.x;
      model.position.y += transform.y;
      
      sceneRef.current.add(model);
      diceRef.current = model;
    } else {
      setPositionX(0);
      setPositionY(0);
      const newMesh = createDiceMesh(diceType);
      newMesh.position.set(0, 0, 0);
      newMesh.rotation.set(0, 0, 0);
      sceneRef.current.add(newMesh);
      diceRef.current = newMesh;
    }
    
    setFace(1);
    setRotationDisplay({ x: 0, y: 0, z: 0 });
  }, [diceType, customModels]);

  const updateRotationDisplay = () => {
    const dice = diceRef.current;
    if (!dice) return;
    setRotationDisplay({
      x: Number(dice.rotation.x.toFixed(4)),
      y: Number(dice.rotation.y.toFixed(4)),
      z: Number(dice.rotation.z.toFixed(4)),
    });
  };

  // When changing face, reset to neutral orientation
  const handleFaceChange = (value) => {
    setFace(value);
    resetRotation();
  };

  const rotate = (axis, deltaDegrees) => {
    const dice = diceRef.current;
    if (!dice) return;
    const delta = (deltaDegrees * Math.PI) / 180; // deg → rad
    dice.rotation[axis] += delta;
    updateRotationDisplay();
  };

  const moveY = (delta) => {
    const dice = diceRef.current;
    if (!dice) return;
    const newY = positionY + delta;
    setPositionY(newY);
    dice.position.y = newY;
    updateModelTransform(positionX, newY);
  };

  const moveX = (delta) => {
    const dice = diceRef.current;
    if (!dice) return;
    const newX = positionX + delta;
    setPositionX(newX);
    dice.position.x = newX;
    updateModelTransform(newX, positionY);
  };

  const updateModelTransform = (x, y) => {
    setModelTransforms(prev => ({
      ...prev,
      [diceType]: { x, y }
    }));
  };

  const saveFace = () => {
    const dice = diceRef.current;
    if (!dice) return;
    const { x, y, z } = dice.rotation;
    const rx = Number(x.toFixed(6));
    const ry = Number(y.toFixed(6));
    const rz = Number(z.toFixed(6));

    const eulerString = `${face}: new THREE.Euler(${rx}, ${ry}, ${rz}),`;
    console.log(`[${diceType}] Face ${eulerString}`);
    
    setSavedFaces(prev => ({
      ...prev,
      [`${diceType}_${face}`]: { x: rx, y: ry, z: rz }
    }));
  };

  const handleDiceTypeChange = (newType) => {
    setDiceType(newType);
    // Don't clear savedFaces, we want to accumulate them across types
  };

  const resetRotation = () => {
    const dice = diceRef.current;
    if (!dice) return;
    dice.rotation.set(0, 0, 0);
    updateRotationDisplay();
  };

  const maxFaces = DICE_CONFIG[diceType]?.sides || 6;

  // Update lights when profile colors change
  useEffect(() => {
    if (sceneRef.current && sceneRef.current.userData) {
      const { fill1, fill2, ambient, dir } = sceneRef.current.userData;
      if (fill1) fill1.color.set(profileColors.primary);
      if (fill2) fill2.color.set(profileColors.secondary);
      if (ambient) ambient.color.set(profileColors.secondary);
      if (dir) dir.color.set(profileColors.primary);
    }
  }, [profileColors]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-6 gap-4">
      <h1 className="text-xl font-bold tracking-[0.25em] text-center">
        {diceType.toUpperCase()} FACE ALIGNER
      </h1>
      <p className="text-xs text-slate-300 max-w-md text-center">
        Use the rotate buttons to make the CHOSEN FACE point upward. Then hit
        "Save Face" and copy the logged Euler rotation for that face.
      </p>

      {/* Dice Type Selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {Object.keys(DICE_CONFIG).map((type) => (
          <button
            key={type}
            onClick={() => handleDiceTypeChange(type)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              diceType === type
                ? 'bg-[#37F2D1] text-black'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {type.toUpperCase()}
            {customModels[type] && <span className="ml-1 text-xs">✓</span>}
          </button>
        ))}
      </div>

      {/* Model Upload */}
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 rounded-lg bg-[#FF5722] hover:bg-[#FF6B3D] text-white text-sm font-bold cursor-pointer transition-all">
          {isLoadingModel ? 'Loading...' : `Upload ${diceType.toUpperCase()} Model (.glb)`}
          <input
            type="file"
            accept=".glb,.gltf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoadingModel}
          />
        </label>
        {customModels[diceType] && (
          <span className="text-xs text-emerald-400">Custom model loaded</span>
        )}
      </div>

      <div 
        className="w-72 h-72 bg-black/60 rounded-2xl border border-white/20 mb-4 cursor-grab active:cursor-grabbing" 
        ref={mountRef} 
      />
      <p className="text-xs text-slate-400 -mt-2 mb-2">Drag to rotate • Scroll to zoom</p>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">Face number:</span>
        <input
          type="number"
          min={1}
          max={maxFaces}
          value={face}
          onChange={(e) => handleFaceChange(Math.min(maxFaces, Math.max(1, Number(e.target.value))))}
          className="w-16 px-2 py-1 rounded bg-black/70 border border-white/30 text-center text-sm"
        />
        <span className="text-xs text-slate-400">/ {maxFaces}</span>
        <button
          onClick={resetRotation}
          className="px-3 py-1 text-xs rounded-full bg-slate-700 hover:bg-slate-600"
        >
          Reset
        </button>
      </div>

      {/* Position controls */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm">Position:</span>
        <button onClick={() => moveY(0.1)} className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-xs">
          ↑ Up
        </button>
        <button onClick={() => moveY(-0.1)} className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-xs">
          ↓ Down
        </button>
        <button onClick={() => moveX(-0.1)} className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-xs">
          ← Left
        </button>
        <button onClick={() => moveX(0.1)} className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-xs">
          → Right
        </button>
        <span className="text-xs text-slate-400">X:{positionX.toFixed(2)} Y:{positionY.toFixed(2)}</span>
        <button onClick={() => { setPositionY(0); setPositionX(0); if (diceRef.current) { diceRef.current.position.y = 0; diceRef.current.position.x = 0; } }} className="px-2 py-1 bg-slate-600 rounded hover:bg-slate-500 text-xs">
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <button onClick={() => rotate("x", 5)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">
          X +5°
        </button>
        <button onClick={() => rotate("y", 5)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">
          Y +5°
        </button>
        <button onClick={() => rotate("z", 5)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">
          Z +5°
        </button>
        <button onClick={() => rotate("x", -5)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">
          X -5°
        </button>
        <button onClick={() => rotate("y", -5)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">
          Y -5°
        </button>
        <button onClick={() => rotate("z", -5)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">
          Z -5°
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
        <button onClick={() => rotate("x", 1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">
          X +1°
        </button>
        <button onClick={() => rotate("y", 1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">
          Y +1°
        </button>
        <button onClick={() => rotate("z", 1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">
          Z +1°
        </button>
        <button onClick={() => rotate("x", -1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">
          X -1°
        </button>
        <button onClick={() => rotate("y", -1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">
          Y -1°
        </button>
        <button onClick={() => rotate("z", -1)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">
          Z -1°
        </button>
      </div>

      <div className="mt-2 text-xs text-slate-300">
        Current rotation (radians): x={rotationDisplay.x}, y={rotationDisplay.y}, z={rotationDisplay.z}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={saveFace}
          className="px-4 py-2 rounded-full bg-emerald-400 text-black text-xs font-bold hover:bg-emerald-300"
        >
          Save Face {face}
        </button>
        <button
          onClick={resetRotation}
          className="px-4 py-2 rounded-full bg-slate-600 text-white text-xs font-bold hover:bg-slate-500"
        >
          Reset
        </button>
      </div>

      {/* Testing Section */}
      <div className="mt-8 p-6 bg-slate-800/50 rounded-xl border border-white/10 w-full max-w-lg">
        <h3 className="text-lg font-bold mb-4 text-[#37F2D1] tracking-wider">ANIMATION & SOUND TEST</h3>
        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Force Result (leave empty for random)</label>
            <input 
              type="number" 
              value={testResult}
              onChange={(e) => setTestResult(e.target.value)}
              placeholder="e.g. 20 for Crit"
              className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={handleTestRoll}
            className="px-4 py-2 h-[42px] rounded bg-[#37F2D1] text-black text-sm font-bold hover:bg-[#2dd9bd] transition-colors"
          >
            Force Roll
          </button>
        </div>

        <div className="h-64 bg-black/40 rounded-lg overflow-hidden relative border border-white/10">
            <DiceRoller 
              ref={diceRollerRef}
              embedded={true} 
              initialDice="d20"
              primaryColor={profileColors.primary}
              secondaryColor={profileColors.secondary}
              forcedResult={testResult ? parseInt(testResult) : null}
            />
        </div>
      </div>

      {/* Saved faces display */}
      {Object.keys(savedFaces).length > 0 && (
        <div className="mt-6 p-4 bg-black/40 rounded-lg w-full max-w-lg">
          <h3 className="text-sm font-bold mb-2">Saved Face Rotations for {diceType.toUpperCase()}:</h3>
          <pre className="text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`${diceType}: {
${Object.entries(savedFaces)
  .filter(([key]) => key.startsWith(diceType))
  .map(([key, r]) => {
    const faceNum = key.split('_')[1];
    return `  ${faceNum}: new THREE.Euler(${r.x}, ${r.y}, ${r.z}),`;
  })
  .join('\n')}
},`}
          </pre>
          <button
            onClick={() => {
              const code = `${diceType}: {\n${Object.entries(savedFaces)
                .filter(([key]) => key.startsWith(diceType))
                .map(([key, r]) => {
                  const faceNum = key.split('_')[1];
                  return `  ${faceNum}: new THREE.Euler(${r.x}, ${r.y}, ${r.z}),`;
                })
                .join('\n')}\n},`;
              navigator.clipboard.writeText(code);
            }}
            className="mt-3 px-4 py-2 rounded-full bg-[#37F2D1] text-black text-xs font-bold hover:bg-[#2dd9bd]"
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      {/* Save All to App Button */}
      {(Object.keys(customModelFiles).length > 0 || Object.keys(savedFaces).length > 0) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-[#FF5722]/20 to-[#37F2D1]/20 rounded-lg w-full max-w-lg border border-white/20">
          <h3 className="text-sm font-bold mb-3 text-center">Save Configuration to App</h3>
          <div className="text-xs text-slate-300 mb-4 space-y-1">
            {Object.keys(customModelFiles).length > 0 && (
              <p>• {Object.keys(customModelFiles).length} custom model(s) ready: {Object.keys(customModelFiles).join(', ')}</p>
            )}
            {Object.keys(savedFaces).length > 0 && (
              <p>• {Object.keys(savedFaces).length} face rotation(s) calibrated</p>
            )}
          </div>
          {campaigns.length > 0 && (
            <div className="mb-3">
              <label className="text-xs text-slate-400 mb-1 block">Save to Campaign (Shared)</label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full bg-[#1E2430] border border-white/20 rounded px-2 py-1 text-sm"
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={saveModelsToApp}
            disabled={isSavingToApp}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#FF6B3D] text-white font-bold hover:from-[#FF6B3D] hover:to-[#FF8A65] transition-all disabled:opacity-50"
          >
            {isSavingToApp ? 'Saving...' : '💾 Save Models & Rotations'}
          </button>
          <p className="text-xs text-slate-400 mt-2 text-center">
            This will upload models and copy the configuration for integration
          </p>
        </div>
      )}
    </div>
  );
}