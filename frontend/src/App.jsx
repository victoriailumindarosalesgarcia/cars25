import { useState, useRef, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function App() {
  let [location, setLocation] = useState("");
  let [cars, setCars] = useState([]);
  let [simSpeed, setSimSpeed] = useState(10);

  const running = useRef(null);

  const EXTENT_X = 25;
  const SCALE_PX = 32;
  const BLUE_ID  = 1;

  const [speedData, setSpeedData] = useState([]);
  const sampleIndexRef = useRef(0);
  const prevXRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(running.current);
  }, []);

  let setup = () => {
    fetch("http://localhost:8000/simulations", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
      .then(resp => resp.json())
      .then(data => {
        setLocation(data["Location"]);
        setCars(data["cars"]);
        setSpeedData([]);
        sampleIndexRef.current = 0;
        prevXRef.current = null;

        const blue = (data["cars"] || []).find(c => c.id === BLUE_ID);
        if (blue && blue.pos && blue.pos.length > 0) {
          prevXRef.current = blue.pos[0];
        }
      });
  };

  const handleStart = () => {
    if (!location) return;
    clearInterval(running.current);
    running.current = setInterval(() => {
      fetch("http://localhost:8000" + location)
        .then(res => res.json())
        .then(data => {
          setCars(data["cars"]);
          const blue = (data["cars"] || []).find(c => c.id === BLUE_ID);
          if (blue && blue.pos && blue.pos.length > 0) {
            const currX = blue.pos[0];
            if (prevXRef.current != null) {
              let dx = currX - prevXRef.current;
              if (dx < -EXTENT_X / 2) dx += EXTENT_X;
              if (dx >  EXTENT_X / 2) dx -= EXTENT_X;

              const speedPxPerSec = dx * SCALE_PX * simSpeed;

              const n = ++sampleIndexRef.current;
              setSpeedData(prev => {
                const next = [...prev, { n, speed: speedPxPerSec }];
                if (next.length > 200) next.shift();
                return next;
              });
            }
            prevXRef.current = currX;
          }
        });
    }, 1000 / simSpeed);
  };

  const handleStop = () => {
    clearInterval(running.current);
  };

  const handleSimSpeedSliderChange = (event) => {
    const newValue = Number(event.target.value);
    setSimSpeed(newValue);
    if (running.current) {
      clearInterval(running.current);
      handleStart();
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h2>Simulación de Tráfico</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={setup}>Setup</button>
        <button onClick={handleStart} disabled={!location}>Start</button>
        <button onClick={handleStop}>Stop</button>

        <label style={{ marginLeft: 16 }}>
          Velocidad (Hz):&nbsp;
          <input
            type="number"
            min={1}
            max={60}
            step={1}
            value={simSpeed}
            onChange={handleSimSpeedSliderChange}
            style={{ width: 64 }}
          />
        </label>
      </div>

      {/* Pista / carretera */}
      <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg" style={{ backgroundColor: "white", borderRadius: 8, boxShadow: '0 0 8px rgba(0,0,0,0.1)' }}>
        <rect x={0} y={200} width={800} height={80} style={{ fill: "darkgray" }}></rect>
        {/* Autos */}
        {cars.map(car => (
          <image
            key={car.id}
            id={car.id}
            x={car.pos[0] * SCALE_PX}
            y={240}
            width={32}
            href={car.id === 1 ? "./dark-racing-car.png" : "./racing-car.png"}
            alt={car.id === 1 ? "carro-azul" : "carro"}
          />
        ))}
      </svg>

      {/* Gráfico de velocidad del carro azul */}
      <div style={{ width: 800, height: 220, marginTop: 18 }}>
        <ResponsiveContainer>
          <LineChart data={speedData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="n" tickCount={6} label={{ value: 'muestra', position: 'insideBottomRight', offset: -5 }} />
            <YAxis tickCount={6} label={{ value: 'px/seg', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(v) => `${v.toFixed(1)} px/s`} labelFormatter={(l) => `muestra ${l}`} />
            <Line type="monotone" dataKey="speed" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
