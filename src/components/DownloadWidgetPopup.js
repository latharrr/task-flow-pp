'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function DownloadWidgetPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Check if dismissed
    const isDismissed = localStorage.getItem('widget_popup_dismissed');
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('widget_popup_dismissed', 'true');
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <>
      {/* Bottom Popup Banner */}
      <div 
        style={{
          position: 'fixed',
          bottom: '72px', // sits right above bottom navigation bar
          left: '16px',
          right: '16px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '2px solid #111827',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '4px 4px 0px 0px #111827',
          zIndex: 999,
          animation: 'sheetSlideUp 300ms ease-out',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>
              Add TaskFlow Widget to Android
            </div>
          </div>
          <button 
            onClick={handleDismiss} 
            style={{ 
              fontSize: '18px', 
              color: '#6b7280', 
              lineHeight: 1, 
              padding: '0 4px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>

        {/* Text */}
        <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.4' }}>
          Track tasks and mark them complete instantly from your device's home screen!
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
          <a 
            href="/TaskFlow.apk" 
            download 
            onClick={handleDismiss}
            style={{
              flex: 1,
              minWidth: '100px',
              background: '#22c55e',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              padding: '8px 6px',
              borderRadius: '6px',
              border: '1.5px solid #111827',
              boxShadow: '1.5px 1.5px 0px 0px #111827',
              textAlign: 'center',
              textDecoration: 'none'
            }}
          >
            Download APK
          </a>
          <button 
            onClick={() => setShowInstructions(true)}
            style={{
              flex: 1,
              minWidth: '100px',
              background: '#6366f1',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              padding: '8px 6px',
              borderRadius: '6px',
              border: '1.5px solid #111827',
              boxShadow: '1.5px 1.5px 0px 0px #111827',
              textAlign: 'center'
            }}
          >
            Widget Guide
          </button>
          <button 
            onClick={handleDismiss}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              fontSize: '11px',
              fontWeight: '500',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1.5px solid #d1d5db',
              textAlign: 'center'
            }}
          >
            Later
          </button>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            style={{
              background: '#ffffff',
              border: '2.5px solid #111827',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '360px',
              padding: '20px',
              boxShadow: '6px 6px 0px 0px #111827',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                How to Add Widget
              </div>
              <button 
                onClick={() => setShowInstructions(false)}
                style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Widget Image Preview */}
            <div 
              style={{
                border: '1.5px dashed #6366f1',
                borderRadius: '8px',
                padding: '4px',
                background: '#f9fafb',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}
            >
              <img 
                src="/widget-preview.png" 
                alt="Widget Preview"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '6px',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Steps list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ background: '#eef2ff', border: '1.5px solid #111827', borderRadius: '999px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>1</div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>
                  Tap the browser menu (<strong>three dots</strong> on Chrome) and select <strong>"Add to Home screen"</strong> to install the app.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ background: '#eef2ff', border: '1.5px solid #111827', borderRadius: '999px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>2</div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>
                  Go to your Android home screen, <strong>long-press</strong> on any empty space, and choose <strong>"Widgets"</strong>.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ background: '#eef2ff', border: '1.5px solid #111827', borderRadius: '999px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>3</div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>
                  Scroll/Search for <strong>"TaskFlow"</strong>, drag the widget onto your home screen, and place it.
                </div>
              </div>
            </div>

            {/* Download APK Button inside Modal */}
            <a
              href="/TaskFlow.apk"
              download
              onClick={() => {
                setShowInstructions(false);
                handleDismiss();
              }}
              style={{
                display: 'block',
                width: '100%',
                background: '#22c55e',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                padding: '10px 0',
                borderRadius: '8px',
                border: '1.5px solid #111827',
                boxShadow: '3px 3px 0px 0px #111827',
                textAlign: 'center',
                textDecoration: 'none',
                marginTop: '10px'
              }}
            >
              📥 Download Android App (.apk)
            </a>

            <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', lineHeight: '1.4' }}>
              Once installed, simply log in to sync your tasks securely in real-time.
            </div>

            {/* Close Button */}
            <button 
              onClick={() => {
                setShowInstructions(false);
                handleDismiss();
              }}
              style={{
                width: '100%',
                background: '#111827',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                padding: '10px 0',
                borderRadius: '8px',
                border: '1.5px solid #111827',
                boxShadow: '3px 3px 0px 0px #6366f1',
                textAlign: 'center',
                marginTop: '4px'
              }}
            >
              Close Guide
            </button>
          </div>
        </div>
      )}
    </>
  );
}
