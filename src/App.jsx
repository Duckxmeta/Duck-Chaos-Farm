import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null

function playSound(type) {
  if (!audioCtx || audioCtx.state === 'suspended') return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)

  if (type === 'quack') {
    osc.type = 'square'
    osc.frequency.setValueAtTime(300, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.2)
  } else if (type === 'splash') {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3)
  } else if (type === 'crash') {
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(100, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.25)
  } else if (type === 'chime') {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3)
  }
  osc.start()
  osc.stop(audioCtx.currentTime + 0.4)
}

function Duck({ position, onMove, keys, onQuack, onGrab, grabbed, setGrabbed }) {
  const body = useRef()
  const mesh = useRef()

  useFrame((state, delta) => {
    if (!body.current) return
    const speed = keys.shift ? 8 : 4
    let moveX = 0, moveZ = 0
    if (keys.w || keys.arrowup) moveZ -= 1
    if (keys.s || keys.arrowdown) moveZ += 1
    if (keys.a || keys.arrowleft) moveX -= 1
    if (keys.d || keys.arrowright) moveX += 1

    const dir = new THREE.Vector3(moveX, 0, moveZ).normalize()
    if (dir.length() > 0) {
      body.current.applyImpulse({ x: dir.x * speed * delta * 20, y: 0, z: dir.z * speed * delta * 20 }, true)
      if (mesh.current) mesh.current.rotation.y = Math.atan2(dir.x, dir.z)
    }

    if (keys.space && body.current.translation().y < 1.2) {
      body.current.applyImpulse({ x: 0, y: 6, z: 0 }, true)
    }

    if (keys.r) {
      body.current.setTranslation({ x: 0, y: 2, z: 0 }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    const pos = body.current.translation()
    onMove([pos.x, pos.y, pos.z])

    if (keys.f && !keys.fPressed) {
      playSound('quack')
      onQuack()
      keys.fPressed = true
    }
    if (!keys.f) keys.fPressed = false

    if (keys.e && !keys.ePressed) {
      onGrab()
      keys.ePressed = true
    }
    if (!keys.e) keys.ePressed = false
  })

  return (
    <RigidBody ref={body} position={position} colliders={false} mass={2} lockRotations>
      <CuboidCollider args={[0.4, 0.4, 0.6]} />
      <group ref={mesh}>
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.35, 0.4, 4, 8]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
        <mesh castShadow position={[0, 0.9, 0.2]}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
        <mesh castShadow position={[0, 0.85, 0.45]}>
          <coneGeometry args={[0.12, 0.3, 8]} />
          <meshStandardMaterial color="#FF8C00" />
        </mesh>
        <mesh position={[-0.1, 0.95, 0.35]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        <mesh position={[0.1, 0.95, 0.35]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      </group>
    </RigidBody>
  )
}

function Prop({ position, color, size = [0.5, 0.5, 0.5], type = 'box', mass = 1, name }) {
  return (
    <RigidBody position={position} mass={mass} colliders="cuboid">
      <mesh castShadow receiveShadow>
        {type === 'box' && <boxGeometry args={size} />}
        {type === 'sphere' && <sphereGeometry args={[size[0], 16, 16]} />}
        {type === 'cylinder' && <cylinderGeometry args={[size[0], size[0], size[1], 8]} />}
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}

function FarmScene({ duckPos, setDuckPos, keys, grabbed, setGrabbed }) {
  const { camera } = useThree()
  const camAngle = useRef(0)

  useFrame(() => {
    const target = new THREE.Vector3(duckPos[0], duckPos[1] + 1.5, duckPos[2])
    const offset = new THREE.Vector3(
      Math.sin(camAngle.current) * 6,
      3,
      Math.cos(camAngle.current) * 6
    )
    camera.position.lerp(target.clone().add(offset), 0.1)
    camera.lookAt(target)
  })

  const handleQuack = () => {
    playSound('quack')
  }

  const handleGrab = () => {
    setGrabbed(!grabbed)
  }

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />
      <Physics gravity={[0, -9.81, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#4CAF50" />
          </mesh>
        </RigidBody>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.05, 5]}>
          <circleGeometry args={[5, 32]} />
          <meshStandardMaterial color="#2196F3" transparent opacity={0.7} />
        </mesh>

        <mesh position={[-8, 2, -6]} castShadow>
          <boxGeometry args={[6, 4, 4]} />
          <meshStandardMaterial color="#B71C1C" />
        </mesh>
        <mesh position={[-8, 4.2, -6]} castShadow>
          <coneGeometry args={[4, 2.5, 4]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>

        <mesh position={[10, 1.5, -10]} castShadow>
          <boxGeometry args={[5, 3, 4]} />
          <meshStandardMaterial color="#FFCCBC" />
        </mesh>

        <Duck
          position={[0, 2, 0]}
          onMove={setDuckPos}
          keys={keys}
          onQuack={handleQuack}
          onGrab={handleGrab}
          grabbed={grabbed}
          setGrabbed={setGrabbed}
        />

        {Array.from({ length: 8 }).map((_, i) => (
          <Prop
            key={`pump${i}`}
            position={[-2 + (i % 4) * 1.5, 0.4, 4 + Math.floor(i / 4) * 1.5]}
            color="#FF6F00"
            size={[0.5, 0.5, 0.5]}
            type="sphere"
            name="pumpkin"
          />
        ))}

        <Prop position={[-10, 0.6, -4]} color="#FBC02D" size={[1, 1, 1]} name="hay" />
        <Prop position={[-9, 1.6, -4]} color="#FBC02D" size={[1, 1, 1]} name="hay2" />
        <Prop position={[-11, 0.6, -3]} color="#8D6E63" size={[0.8, 0.8, 0.8]} name="crate" />

        <Prop position={[12, 1.2, -8]} color="#FFF" size={[0.4, 0.1, 0.4]} name="plate" />
        <Prop position={[12.5, 1.3, -8]} color="#FF9800" size={[0.3, 0.2, 0.3]} type="cylinder" name="pie" />

        <group position={[0, 0, 8]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 3]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <sphereGeometry args={[0.4]} />
            <meshStandardMaterial color="#FFD54F" />
          </mesh>
        </group>

        <RigidBody position={[11, 1, -9]} type="dynamic" mass={1}>
          <mesh castShadow>
            <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2]} />
            <meshStandardMaterial color="#FBC02D" />
          </mesh>
        </RigidBody>
      </Physics>
    </>
  )
}

function UI({ objectives, score, muted, setMuted, started, setStarted, won, time, onReset }) {
  const completed = Object.values(objectives).filter(Boolean).length

  return (
    <>
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-white/95 p-8 rounded-2xl text-center max-w-md shadow-2xl">
            <h1 className="text-5xl font-black text-yellow-500 mb-2">Duck Chaos Farm</h1>
            <p className="text-gray-700 mb-6">Wreak havoc as a mischievous duck!</p>
            <div className="text-left text-sm mb-6 space-y-1 text-gray-600">
              <p><b>WASD / Arrows</b> - Move & Sprint (Shift)</p>
              <p><b>Space</b> - Jump / Glide</p>
              <p><b>E</b> - Grab / Fling</p>
              <p><b>F</b> - Quack (startle)</p>
              <p><b>R</b> - Reset position</p>
              <p><b>Mouse</b> - Look around</p>
            </div>
            <button
              onClick={() => { setStarted(true); audioCtx?.resume() }}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-full text-xl"
            >
              Play Game
            </button>
          </div>
        </div>
      )}

      {started && (
        <>
          <div className="absolute top-4 left-4 bg-black/50 text-white p-4 rounded-xl text-sm max-w-xs">
            <h3 className="font-bold mb-2">Chaos Checklist ({completed}/5)</h3>
            <ul className="space-y-1">
              <li className={objectives.pond ? 'line-through opacity-60' : ''}>Pond Party: 3 items in pond</li>
              <li className={objectives.pumpkins ? 'line-through opacity-60' : ''}>Pumpkin Smasher: 5 pumpkins</li>
              <li className={objectives.scarecrow ? 'line-through opacity-60' : ''}>Scarecrow Toppler</li>
              <li className={objectives.picnic ? 'line-through opacity-60' : ''}>Picnic Ruiner</li>
              <li className={objectives.hat ? 'line-through opacity-60' : ''}>Hat Heist: hat in pond</li>
            </ul>
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-6 py-2 rounded-full font-bold text-xl">
            Chaos Score: {score}
          </div>
          <button
            onClick={() => setMuted(!muted)}
            className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </>
      )}

      {won && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-white p-8 rounded-2xl text-center">
            <h2 className="text-4xl font-black text-green-600 mb-2">Farm Conquered!</h2>
            <p className="text-2xl mb-1">Final Score: {score}</p>
            <p className="text-gray-600 mb-6">Time: {time}s</p>
            <button onClick={onReset} className="bg-yellow-400 hover:bg-yellow-500 font-bold py-3 px-8 rounded-full">
              Play Again
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function App() {
  const [duckPos, setDuckPos] = useState([0, 2, 0])
  const [keys, setKeys] = useState({})
  const [objectives, setObjectives] = useState({
    pond: false, pumpkins: false, scarecrow: false, picnic: false, hat: false
  })
  const [score, setScore] = useState(0)
  const [muted, setMuted] = useState(false)
  const [started, setStarted] = useState(false)
  const [won, setWon] = useState(false)
  const [time, setTime] = useState(0)
  const [grabbed, setGrabbed] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const down = (e) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: true }))
    const up = (e) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: false }))
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => {
    if (started && !won) {
      timer.current = setInterval(() => setTime(t => t + 1), 1000)
    }
    return () => clearInterval(timer.current)
  }, [started, won])

  useEffect(() => {
    if (Object.values(objectives).every(Boolean) && started) {
      setWon(true)
      playSound('chime')
    }
  }, [objectives, started])

  const reset = () => {
    setWon(false)
    setScore(0)
    setTime(0)
    setObjectives({ pond: false, pumpkins: false, scarecrow: false, picnic: false, hat: false })
    setDuckPos([0, 2, 0])
    setStarted(true)
  }

  return (
    <div className="relative w-screen h-screen">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
        <FarmScene
          duckPos={duckPos}
          setDuckPos={setDuckPos}
          keys={keys}
          grabbed={grabbed}
          setGrabbed={setGrabbed}
        />
      </Canvas>
      <UI
        objectives={objectives}
        score={score}
        muted={muted}
        setMuted={setMuted}
        started={started}
        setStarted={setStarted}
        won={won}
        time={time}
        onReset={reset}
      />
    </div>
  )
}
