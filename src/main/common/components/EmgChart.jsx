import React, { useEffect, useMemo, useState } from "react";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import {findKeyValue} from "../../app/domain/utils/json.util.js";

ChartJS.register(
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    zoomPlugin
);

function DrawChart({ jsonData }) {
    const averagedData = useMemo(() => {
        if (!jsonData) return null;
        return findKeyValue(jsonData, 'Averaged Data');
    }, [jsonData]);

    if (!averagedData)
        return (
            <p className="text-gray-500 mt-4">
                ⚠️ Không tìm thấy dữ liệu Averaged Data trong file EMG.
            </p>
        );

    const parseNumericArray = (raw) => {
        return raw
            .replace(/\//g, "")
            .split(/[,\s]+/)
            .map((x) => x.replace(",", "."))
            .map((x) => parseFloat(x))
            .filter((x) => !isNaN(x));
    };
    const values = parseNumericArray(averagedData);
    const labels = values.map((_, i) => i * 100);
    const data = {
        labels,
        datasets: [
            {
                label: "Điện áp (µV)",
                data: values,
                borderColor: "rgba(45,43,43,0.9)",
                borderWidth: 1.5,
                pointRadius: 0,
                tension: 0.2,
                fill: false,
            },
        ],
    };

    const options = {
        responsive: true,
        animation: false,
        plugins: {
            legend: { display: true },
            title: {
                display: true,
                text: `Bệnh nhân: ${(findKeyValue(jsonData, "First Name") ?? "N/A").trim()}`,
            },
            zoom: {
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: "x",
                },
                pan: {
                    enabled: true,
                    mode: "x",
                },
            },
        },
        scales: {
            x: {
                title: { display: true, text: "Thời gian (ms)" },
                ticks: {
                    callback: (value) => `${value}`,
                    maxRotation: 0,
                },
            },
            y: {
                title: { display: true, text: "Điện áp (µV)" },
                beginAtZero: false,
            },
        },
    };

    return (
        <div className="mt-8 bg-white rounded-2xl shadow p-4">
            <Line data={data} options={options} />
            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => ChartJS.getChart("0")?.reset()}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                >
                    Reset Zoom
                </button>
            </div>
        </div>
    );
}

export default function EmgChart() {
    const [jsonData, setJsonData] = useState({});

    useEffect(() => {
        if (window.electron) {
            window.electron.onEmgData((data) => {
                console.log("Received EMG JSON:", data);
                setJsonData(data);
            });
        }
    }, []);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">EMG Viewer</h1>
            {jsonData ? (
                <DrawChart jsonData={jsonData} />
            ) : (
                <p className="text-gray-500">Chưa có dữ liệu EMG.</p>
            )}
        </div>
    );
}
