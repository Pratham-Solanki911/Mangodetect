import React, { useState, useRef, useCallback, useEffect } from 'react';

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 6a2 2 0 012-2h1.172a2 2 0 011.414.586l.828.828A2 2 0 008.828 6H12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      <path d="M15 8a1 1 0 10-2 0v3a1 1 0 001 1h1a1 1 0 100-2h-1V8z" />
    </svg>
);

interface CameraModalProps {
    onClose: () => void;
    onCapture: (dataUrl: string) => void;
    t: (key: any) => string;
}

const CameraModal: React.FC<CameraModalProps> = ({ onClose, onCapture, t }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Could not access the camera. Please check permissions.");
                onClose();
            }
        };
        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                onCapture(dataUrl);
                onClose();
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-4">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md bg-gray-900"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                <div className="p-4 bg-gray-100 flex justify-end space-x-4 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition">{t('cancel')}</button>
                    <button onClick={handleCapture} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">{t('capture')}</button>
                </div>
            </div>
        </div>
    );
};


interface ImageInputProps {
    onAnalyze: (file: File) => void;
    t: (key: any) => string;
}

const ImageInput: React.FC<ImageInputProps> = ({ onAnalyze, t }) => {
    const [dragging, setDragging] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
             if (e.target.files[0].type.startsWith('image/')) {
                onAnalyze(e.target.files[0]);
            }
        }
    };

    const handleDragEvents = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragging(true);
        } else if (e.type === 'dragleave') {
            setDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                onAnalyze(file);
            }
        }
    }, [onAnalyze]);
    
    const handleUploadAreaClick = () => {
        fileInputRef.current?.click();
    };

    const handleCameraCapture = (dataUrl: string) => {
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                onAnalyze(file);
            });
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {isCameraOpen && <CameraModal t={t} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />}
            <div
                onClick={handleUploadAreaClick}
                onDragEnter={handleDragEvents}
                onDragOver={handleDragEvents}
                onDragLeave={handleDragEvents}
                onDrop={handleDrop}
                className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-300 ${dragging ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'}`}
            >
                <div className="flex flex-col items-center">
                    <div className="p-4 bg-green-100 rounded-full mb-4">
                        <UploadIcon/>
                    </div>
                    <p className="mt-2 text-lg text-gray-600">{t('uploadImage')} {t('or')} <span className="font-semibold text-green-600">{t('dropImage')}</span></p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG, WEBP up to 10MB</p>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={onFileChange} className="hidden" />
                </div>
            </div>
            <div className="flex items-center justify-center my-4">
                <span className="flex-grow bg-gray-300 h-px"></span>
                <span className="mx-4 text-gray-500 font-semibold">{t('or')}</span>
                <span className="flex-grow bg-gray-300 h-px"></span>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent the upload area's click handler from firing
                    setIsCameraOpen(true);
                }}
                className="w-full flex items-center justify-center py-3 px-6 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105"
            >
                <CameraIcon />
                {t('useCamera')}
            </button>
        </div>
    );
};

export default ImageInput;