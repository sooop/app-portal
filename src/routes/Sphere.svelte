<script>
  import { onMount, onDestroy } from 'svelte';

  // Props
  let {
    sphereRadius = 300,
    numPoints = 250,
    baseParticleSize = 0.8,
    particleSizeVariation = 0.1,
    particleColor = {
      hue: 220,
      saturation: 60,
      lightness: 50
    },
    rotationSpeed = {
      x: 0.001,
      y: 0.003
    },
    fadeSpeed = 0.45,
    isPaused = false,
    // 새로운 기능들을 위한 설정
    particleLifetime = {
      min: 3000,  // 최소 수명 (ms)
      max: 8000   // 최대 수명 (ms)
    },
    connectionDistance = 120,  // 연결 가능한 최대 거리
    connectionOpacity = 0.3,   // 연결선의 최대 투명도
    enableConnections = true,  // 연결선 활성화 여부
    enableLifecycle = true     // 수명 주기 활성화 여부
  } = $props();

  // Canvas 참조
  let canvas = $state();
  let ctx = $state();
  let animationId = $state();

  // 애니메이션 상태
  let points = $state(/** @type {any[]} */ ([]));
  let angleX = $state(0);
  let angleY = $state(0);
  let time = $state(0);
  let centerX = $state(0);
  let centerY = $state(0);
  let isInitialized = $state(false);

  class RotatingSphere {
    /** @type {any[]} */
    points = [];
    /** @type {number} */
    angleX = 0;
    /** @type {number} */
    angleY = 0;
    /** @type {number} */
    time = 0;
    /** @type {any} */
    config = {};
    /** @type {boolean} */
    isDestroyed = false;
    /** @type {HTMLCanvasElement} */
    canvas;
    /** @type {CanvasRenderingContext2D | null} */
    ctx;
    /** @type {number} */
    centerX = 0;
    /** @type {number} */
    centerY = 0;

    constructor(/** @type {HTMLCanvasElement} */ canvasElement, /** @type {any} */ config) {
      this.canvas = canvasElement;
      this.ctx = this.canvas?.getContext('2d');
      this.points = [];
      this.angleX = 0;
      this.angleY = 0;
      this.time = 0;
      this.config = { ...config };
      this.isDestroyed = false;
      
      if (!this.ctx) {
        console.error('Canvas context를 가져올 수 없습니다.');
        return;
      }
      
      this.init();
      this.createPoints();
    }

    init() {
      if (!this.canvas || !this.ctx || !this.canvas.parentElement) return;
      
      // 디바이스 픽셀 비율 고려
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      
      this.centerX = rect.width / 2;
      this.centerY = rect.height / 2;
    }

    createPoints() {
      this.points = [];
      
      for (let i = 0; i < this.config.numPoints; i++) {
        this.addNewPoint();
      }
    }

    addNewPoint() {
      // 랜덤한 구체 표면 위치 생성
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      
      const now = Date.now();
      const lifetime = this.config.particleLifetime.min + 
        Math.random() * (this.config.particleLifetime.max - this.config.particleLifetime.min);
      
      this.points.push({
        originalX: x * this.config.sphereRadius,
        originalY: y * this.config.sphereRadius,
        originalZ: z * this.config.sphereRadius,
        baseOpacity: Math.random() * 0.6 + 0.2,
        opacityOffset: Math.random() * Math.PI * 2,
        opacitySpeed: Math.random() * 0.02 + 0.005,
        sizeMultiplier: 1 + (Math.random() - 0.5) * 2 * this.config.particleSizeVariation,
        // 수명 주기 관련 속성들
        birthTime: now,
        lifetime: lifetime,
        deathTime: now + lifetime,
        isAlive: true,
        fadePhase: 'in' // 'in', 'stable', 'out'
      });
    }

    updatePointLifecycle() {
      if (!this.config.enableLifecycle) return;
      
      const now = Date.now();
      const fadeDuration = 1000; // 페이드 인/아웃 지속 시간 (ms)
      
      this.points.forEach((point, index) => {
        const age = now - point.birthTime;
        const timeToDeath = point.deathTime - now;
        
        // 페이드 아웃 시작
        if (timeToDeath <= fadeDuration && point.fadePhase === 'stable') {
          point.fadePhase = 'out';
        }
        // 점이 완전히 사라짐
        else if (timeToDeath <= 0) {
          // 새로운 점으로 교체
          this.points[index] = this.createNewPointData();
        }
        // 페이드 인 완료
        else if (age >= fadeDuration && point.fadePhase === 'in') {
          point.fadePhase = 'stable';
        }
      });
    }

    createNewPointData() {
      // 랜덤한 구체 표면 위치 생성
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      
      const now = Date.now();
      const lifetime = this.config.particleLifetime.min + 
        Math.random() * (this.config.particleLifetime.max - this.config.particleLifetime.min);
      
      return {
        originalX: x * this.config.sphereRadius,
        originalY: y * this.config.sphereRadius,
        originalZ: z * this.config.sphereRadius,
        baseOpacity: Math.random() * 0.6 + 0.2,
        opacityOffset: Math.random() * Math.PI * 2,
        opacitySpeed: Math.random() * 0.02 + 0.005,
        sizeMultiplier: 1 + (Math.random() - 0.5) * 2 * this.config.particleSizeVariation,
        birthTime: now,
        lifetime: lifetime,
        deathTime: now + lifetime,
        isAlive: true,
        fadePhase: 'in'
      };
    }

    rotatePoint(/** @type {any} */ point, /** @type {number} */ angleX, /** @type {number} */ angleY) {
      // Y축 회전
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const x1 = point.originalX * cosY - point.originalZ * sinY;
      const z1 = point.originalX * sinY + point.originalZ * cosY;
      
      // X축 회전
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const y1 = point.originalY * cosX - z1 * sinX;
      const z2 = point.originalY * sinX + z1 * cosX;
      
      return { x: x1, y: y1, z: z2 };
    }

    draw() {
      if (!this.ctx || this.isDestroyed) return;
      
      // 수명 주기 업데이트
      this.updatePointLifecycle();
      
      // 캔버스 완전 초기화
      if (this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      
      // 성능 최적화: 미리 계산된 점들 사용
      const rotatedPoints = this.points.map(point => {
        const rotated = this.rotatePoint(point, this.angleX, this.angleY);
        
        // 시간에 따른 개별 투명도 변화
        const opacityVariation = Math.sin(this.time * point.opacitySpeed + point.opacityOffset) * 0.3;
        let baseOpacity = Math.max(0.1, Math.min(1, point.baseOpacity + opacityVariation));
        
        // 수명 주기에 따른 투명도 조정
        if (this.config.enableLifecycle) {
          const now = Date.now();
          const age = now - point.birthTime;
          const timeToDeath = point.deathTime - now;
          const fadeDuration = 1000;
          
          if (point.fadePhase === 'in') {
            // 페이드 인: 0에서 baseOpacity로
            const fadeProgress = Math.min(1, age / fadeDuration);
            baseOpacity *= fadeProgress;
          } else if (point.fadePhase === 'out') {
            // 페이드 아웃: baseOpacity에서 0으로
            const fadeProgress = Math.min(1, Math.max(0, timeToDeath / fadeDuration));
            baseOpacity *= fadeProgress;
          }
        }
        
        return {
          ...point,
          ...rotated,
          currentOpacity: baseOpacity,
          screenX: this.centerX + rotated.x * ((600 + rotated.z) / 600),
          screenY: this.centerY + rotated.y * ((600 + rotated.z) / 600)
        };
      });
      
      // Z값으로 정렬 (성능 최적화: 필요한 경우에만)
      rotatedPoints.sort((a, b) => a.z - b.z);
      
      // 배치 렌더링을 위한 설정
      this.ctx.save();
      
      // 연결선 그리기 (점들보다 먼저 그려서 뒤에 오도록)
      if (this.config.enableConnections) {
        this.drawConnections(rotatedPoints);
      }
      
      // 점들 그리기
      rotatedPoints.forEach(point => {
        const scale = (600 + point.z) / 600;
        const x = point.screenX;
        const y = point.screenY;
        
        // 화면 경계 체크 최적화
        if (scale > 0.2 && x >= -50 && x <= (this.canvas?.width || 0) + 50 && y >= -50 && y <= (this.canvas?.height || 0) + 50) {
          const size = this.config.baseParticleSize * point.sizeMultiplier * (1 + scale);
          const opacity = point.currentOpacity * scale * 0.9;
          
          const hue = this.config.particleColor.hue;
          const saturation = Math.min(100, this.config.particleColor.saturation + scale * 20);
          const lightness = Math.min(100, this.config.particleColor.lightness + scale * 30);
          
          // 글로우 효과
          if (this.ctx) {
            this.ctx.beginPath();
            this.ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.ctx.shadowBlur = size * 4;
            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      });
      
      if (this.ctx) {
        this.ctx.restore();
      }
    }

    drawConnections(/** @type {any[]} */ rotatedPoints) {
      if (!this.ctx || !this.config.enableConnections) return;
      
      const maxDistance = this.config.connectionDistance;
      const maxOpacity = this.config.connectionOpacity;
      const maxDistanceSquared = maxDistance * maxDistance; // 제곱근 계산 최적화
      
      // 성능 최적화: 거리 기반 필터링 및 공간 분할
      const visiblePoints = rotatedPoints.filter(/** @type {any} */ point => 
        point.z > -500 && // 너무 멀리 있는 점들은 제외
        point.currentOpacity > 0.1
      );
      
      // 성능 최적화: 너무 많은 점이 있으면 제한
      const maxConnections = 1000;
      const connectionCount = Math.min(visiblePoints.length * (visiblePoints.length - 1) / 2, maxConnections);
      let drawnConnections = 0;
      
      // 연결선을 투명도 순으로 정렬하여 가장 진한 것부터 그리기
      const connections = [];
      
      for (let i = 0; i < visiblePoints.length && drawnConnections < connectionCount; i++) {
        for (let j = i + 1; j < visiblePoints.length && drawnConnections < connectionCount; j++) {
          const point1 = visiblePoints[i];
          const point2 = visiblePoints[j];
          
          const dx = point1.screenX - point2.screenX;
          const dy = point1.screenY - point2.screenY;
          const distanceSquared = dx * dx + dy * dy;
          
          if (distanceSquared < maxDistanceSquared) {
            const distance = Math.sqrt(distanceSquared);
            const opacity = maxOpacity * (1 - distance / maxDistance) * 
                           Math.min(point1.currentOpacity, point2.currentOpacity);
            
            if (opacity > 0.01) {
              connections.push({
                point1,
                point2,
                opacity,
                distance
              });
              drawnConnections++;
            }
          }
        }
      }
      
      // 투명도 순으로 정렬 (진한 것부터)
      connections.sort((a, b) => b.opacity - a.opacity);
      
      // 연결선 그리기
      const hue = this.config.particleColor.hue;
      const saturation = this.config.particleColor.saturation;
      const lightness = this.config.particleColor.lightness;
      
      this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      this.ctx.lineWidth = 1;
      
      connections.forEach(connection => {
        if (this.ctx) {
          this.ctx.globalAlpha = connection.opacity;
          this.ctx.beginPath();
          this.ctx.moveTo(connection.point1.screenX, connection.point1.screenY);
          this.ctx.lineTo(connection.point2.screenX, connection.point2.screenY);
          this.ctx.stroke();
        }
      });
      
      // 투명도 리셋
      if (this.ctx) {
        this.ctx.globalAlpha = 1;
      }
    }

    animate() {
      if (this.isDestroyed) return;
      
      this.time += 0.0001;
      this.angleY += this.config.rotationSpeed.y;
      this.angleX += this.config.rotationSpeed.x;
      this.draw();
    }

    updateConfig(/** @type {any} */ newConfig) {
      if (this.isDestroyed) return;
      
      const needsRecreation = 
        newConfig.sphereRadius !== this.config.sphereRadius ||
        newConfig.numPoints !== this.config.numPoints;
      
      Object.assign(this.config, newConfig);
      
      if (needsRecreation) {
        this.createPoints();
      }
    }

    setColor(/** @type {number} */ hue, /** @type {number} */ saturation = 60, /** @type {number} */ lightness = 50) {
      if (this.isDestroyed) return;
      this.config.particleColor = { hue, saturation, lightness };
    }

    setSphereSize(/** @type {number} */ radius) {
      if (this.isDestroyed) return;
      this.config.sphereRadius = radius;
      this.createPoints();
    }

    destroy() {
      this.isDestroyed = true;
      this.points = [];
      this.ctx = null;
      // @ts-ignore
      this.canvas = null;
    }
  }

  let sphereInstance = $state(/** @type {RotatingSphere | null} */ (null));
  let resizeObserver = $state();

  // 설정이 변경될 때 구체 업데이트 (최적화됨)
  $effect(() => {
    if (sphereInstance && isInitialized) {
      sphereInstance.updateConfig({
        sphereRadius,
        numPoints,
        baseParticleSize,
        particleSizeVariation,
        particleColor,
        rotationSpeed,
        fadeSpeed,
        particleLifetime,
        connectionDistance,
        connectionOpacity,
        enableConnections,
        enableLifecycle
      });
    }
  });

  // 일시정지 상태 관리
  $effect(() => {
    if (sphereInstance && isInitialized) {
      if (isPaused && animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      } else if (!isPaused && !animationId) {
        startAnimation();
      }
    }
  });

  function startAnimation() {
    if (animationId) return;
    
    function animate() {
      if (sphereInstance && !isPaused) {
        sphereInstance.animate();
        animationId = requestAnimationFrame(animate);
      } else {
        animationId = null;
      }
    }
    animate();
  }

  onMount(() => {
    if (!canvas) {
      console.error('Canvas 요소를 찾을 수 없습니다.');
      return;
    }

    // 구체 인스턴스 생성
    sphereInstance = new RotatingSphere(canvas, {
      sphereRadius,
      numPoints,
      baseParticleSize,
      particleSizeVariation,
      particleColor,
      rotationSpeed,
      fadeSpeed,
      particleLifetime,
      connectionDistance,
      connectionOpacity,
      enableConnections,
      enableLifecycle
    });

    if (!sphereInstance || !sphereInstance.ctx) {
      console.error('구체 인스턴스 생성에 실패했습니다.');
      return;
    }

    isInitialized = true;

    // 애니메이션 시작
    if (!isPaused) {
      startAnimation();
    }
  });

  function handleResize() {
    console.log('Window resize event handled!');
    if (sphereInstance) {
      sphereInstance.init();
    }
  }

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (sphereInstance) {
      sphereInstance.destroy();
    }
  });

  // 공개 메서드들
  export function setColor(/** @type {number} */ hue, /** @type {number} */ saturation = 60, /** @type {number} */ lightness = 50) {
    if (sphereInstance && isInitialized) {
      sphereInstance.setColor(hue, saturation, lightness);
    }
  }

  export function setSphereSize(/** @type {number} */ radius) {
    if (sphereInstance && isInitialized) {
      sphereInstance.setSphereSize(radius);
    }
  }

  export function pause() {
    isPaused = true;
  }

  export function resume() {
    isPaused = false;
  }

  export function togglePause() {
    isPaused = !isPaused;
  }

  export function toggleConnections() {
    enableConnections = !enableConnections;
  }

  export function toggleLifecycle() {
    enableLifecycle = !enableLifecycle;
  }

  export function setConnectionDistance(/** @type {number} */ distance) {
    connectionDistance = Math.max(50, Math.min(300, distance));
  }

  export function setConnectionOpacity(/** @type {number} */ opacity) {
    connectionOpacity = Math.max(0, Math.min(1, opacity));
  }

  export function setParticleLifetime(/** @type {number} */ min, /** @type {number} */ max) {
    particleLifetime = {
      min: Math.max(1000, min),
      max: Math.max(min + 1000, max)
    };
  }
</script>

<svelte:window on:resize={handleResize} />

<canvas 
  bind:this={canvas}
  class="sphere-canvas z-[1]"
  aria-label="회전하는 3D 구체 애니메이션"
  tabindex="0"
></canvas>

<style>
  .sphere-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    pointer-events: none;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
  
  .sphere-canvas:focus {
    outline: 2px solid rgba(255, 255, 255, 0.3);
    outline-offset: 2px;
  }
  
  /* 고해상도 디스플레이 최적화 */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .sphere-canvas {
      image-rendering: -webkit-optimize-contrast;
    }
  }
</style>