'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Environment, Float, PerspectiveCamera } from '@react-three/drei';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const LANES = [-4, 0, 4] as const;
const OBSTACLE_COUNT = 12;

type GameSceneProps = {
  isRunning: boolean;
  lane: number;
  resetToken: number;
  onGameOver: (finalScore: number) => void;
  onScoreChange: (score: number) => void;
};

type ObstacleState = {
  laneIndex: number;
  z: number;
  spin: number;
  color: THREE.Color;
  emissive: THREE.Color;
};

const spawnObstacle = (offset = 0): ObstacleState => {
  const laneIndex = Math.floor(Math.random() * LANES.length);
  const z = -30 - Math.random() * 60 - offset;
  const baseColor = new THREE.Color().setHSL(
    THREE.MathUtils.randFloat(0, 1),
    0.55,
    0.6,
  );
  return {
    laneIndex,
    z,
    spin: THREE.MathUtils.randFloat(0.4, 1.2),
    color: baseColor,
    emissive: baseColor.clone().multiplyScalar(0.5),
  };
};

const GameWorld = memo(function GameWorld({
  isRunning,
  lane,
  resetToken,
  onGameOver,
  onScoreChange,
}: GameSceneProps) {
  const playerRef = useRef<THREE.Mesh | null>(null);
  const obstacleRefs = useRef<THREE.Mesh[]>([]);
  const floorRef = useRef<THREE.Mesh | null>(null);
  const stateRef = useRef({
    speed: 10,
    scoreDistance: 0,
    lastScore: 0,
    gameOver: false,
  });
  const obstacleState = useRef<ObstacleState[]>(
    Array.from({ length: OBSTACLE_COUNT }, (_, i) => spawnObstacle(i * 6)),
  );
  const obstacleSlots = useMemo(
    () => Array.from({ length: OBSTACLE_COUNT }, (_, i) => i),
    [],
  );

  const resetWorld = useCallback(() => {
    stateRef.current = {
      speed: 10,
      scoreDistance: 0,
      lastScore: 0,
      gameOver: false,
    };
    obstacleState.current = Array.from({ length: OBSTACLE_COUNT }, (_, i) =>
      spawnObstacle(i * 6),
    );
    obstacleRefs.current.forEach((mesh, index) => {
      const obstacle = obstacleState.current[index];
      if (!mesh || !obstacle) {
        return;
      }
      mesh.position.set(LANES[obstacle.laneIndex], 1, obstacle.z);
      mesh.rotation.set(0, 0, 0);
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.copy(obstacle.color);
        mesh.material.emissive.copy(obstacle.emissive);
      }
    });
    onScoreChange(0);
  }, [onScoreChange]);

  useEffect(() => {
    resetWorld();
  }, [resetToken, resetWorld]);

  const lanePositions = useMemo(() => LANES, []);
  const lerp = THREE.MathUtils.lerp;

  useFrame((_, delta) => {
    if (!playerRef.current || !isRunning || stateRef.current.gameOver) {
      return;
    }

    const state = stateRef.current;
    state.speed = THREE.MathUtils.clamp(
      state.speed + delta * 2.2,
      10,
      40,
    );
    state.scoreDistance += state.speed * delta;
    const currentScore = Math.floor(state.scoreDistance);
    if (currentScore !== state.lastScore) {
      state.lastScore = currentScore;
      onScoreChange(currentScore);
    }

    const targetX = lanePositions[lane] ?? 0;
    playerRef.current.position.x = lerp(
      playerRef.current.position.x,
      targetX,
      0.14,
    );
    playerRef.current.rotation.z = lerp(
      playerRef.current.rotation.z,
      -0.4 * (targetX / 4),
      0.2,
    );

    obstacleState.current.forEach((obstacle, index) => {
      obstacle.z += delta * state.speed * 0.9;
      const mesh = obstacleRefs.current[index];
      if (!mesh) {
        return;
      }
      mesh.position.set(lanePositions[obstacle.laneIndex], 1, obstacle.z);
      mesh.rotation.x += delta * obstacle.spin;
      mesh.rotation.y += delta * obstacle.spin * 1.3;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.copy(obstacle.color);
        mesh.material.emissive.copy(obstacle.emissive);
      }

      if (
        obstacle.z > -0.5 &&
        obstacle.z < 1.8 &&
        obstacle.laneIndex === lane
      ) {
        state.gameOver = true;
        onGameOver(currentScore);
      }

      if (obstacle.z > 8) {
        const next = spawnObstacle();
        next.z = -50 - Math.random() * 40;
        obstacleState.current[index] = next;
      }
    });

  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 7, 14]} fov={46}>
        <group position={[0, 0, -10]} />
      </PerspectiveCamera>

      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 15, 45]} />

      <hemisphereLight intensity={0.7} groundColor="#0f172a" color="#e0f2fe" />
      <directionalLight
        position={[5, 12, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-6, 8, -6]} intensity={1.4} color="#f97316" />

      <mesh ref={playerRef} position={[0, 1, 0]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" />
      </mesh>

      {obstacleSlots.map((slot) => (
        <mesh
          key={slot}
          ref={(instance) => {
            if (instance) {
              obstacleRefs.current[slot] = instance;
            }
          }}
          position={[
            lanePositions[slot % lanePositions.length],
            1,
            -12 - slot * 6,
          ]}
          castShadow
        >
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshStandardMaterial color="#f87171" emissive="#0f172a" />
        </mesh>
      ))}

      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -4]}
        receiveShadow
      >
        <planeGeometry args={[26, 120, 1, 1]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      <Float floatIntensity={2} speed={0.8}>
        <mesh position={[-8, 12, -18]}>
          <torusKnotGeometry args={[1.6, 0.5, 120, 18]} />
          <meshStandardMaterial color="#facc15" emissive="#d97706" />
        </mesh>
      </Float>

      <Stars radius={80} depth={60} factor={2} saturation={0.3} speed={0.2} />
      <Environment preset="city" />
    </>
  );
});

export function GameScene(props: GameSceneProps) {
  return (
    <Canvas
      className="h-full w-full"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <GameWorld {...props} />
    </Canvas>
  );
}
