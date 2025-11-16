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
        <div className="w-full max-w-3xl mx-auto">
            {isCameraOpen && <CameraModal t={t} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />}
            <div
                onClick={handleUploadAreaClick}
                onDragEnter={handleDragEvents}
                onDragOver={handleDragEvents}
                onDragLeave={handleDragEvents}
                onDrop={handleDrop}
                className={`cursor-pointer border-3 border-dashed rounded-3xl p-12 text-center transition-all duration-300 shadow-lg ${dragging ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 scale-105 shadow-2xl' : 'border-green-300 bg-white hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-white hover:shadow-xl card-hover'}`}
            >
                <div className="flex flex-col items-center">
                    <div className="p-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-lg float-animation">
                        <UploadIcon/>
                    </div>
                    <p className="mt-2 text-xl font-semibold text-gray-700">
                        {t('uploadImage')} {t('or')} <span className="font-bold text-green-600">{t('dropImage')}</span>
                    </p>
                    <p className="text-base text-gray-500 mt-3 font-medium">PNG, JPG, WEBP up to 10MB</p>
                    <div className="mt-6 flex items-center space-x-3 text-sm text-gray-600">
                        <span className="flex items-center">
                            <svg className="w-5 h-5 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                            Fast Analysis
                        </span>
                        <span className="flex items-center">
                            <svg className="w-5 h-5 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                            Secure
                        </span>
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={onFileChange} className="hidden" />
                </div>
            </div>
            <div className="flex items-center justify-center my-6">
                <span className="flex-grow bg-gradient-to-r from-transparent via-gray-300 to-transparent h-px"></span>
                <span className="mx-6 text-gray-600 font-bold text-sm uppercase tracking-wide">{t('or')}</span>
                <span className="flex-grow bg-gradient-to-r from-transparent via-gray-300 to-transparent h-px"></span>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsCameraOpen(true);
                }}
                className="w-full flex items-center justify-center py-4 px-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all transform hover:scale-105 glow-button text-lg"
            >
                <CameraIcon />
                {t('useCamera')}
            </button>
        </div>
    );
};

export default ImageInput;