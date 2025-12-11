
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuickCapture } from './QuickCapture';

export const ShareHandler: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [isOpen, setIsOpen] = React.useState(false);
    const [initialContent, setInitialContent] = React.useState('');

    useEffect(() => {
        // 1. Try standard params
        let t = searchParams.get('title');
        let txt = searchParams.get('text');
        let u = searchParams.get('url');

        // 2. Fallback: Manually parse window.location.hash for PWA Share Target idiosyncrasies
        // Sometimes params come as /#/?title=... or /#/capture?title=...
        // and react-router might not sync searchParams instantly or correctly depending on Router setup.
        if (!t && !txt && !u) {
            const hash = window.location.hash;
            if (hash.includes('?')) {
                const query = hash.split('?')[1];
                const params = new URLSearchParams(query);
                t = params.get('title');
                txt = params.get('text');
                u = params.get('url');
            }
        }

        if (t || txt || u) {
            // Construct the content string
            let content = '';
            if (t) content += `${t}\n`;
            if (txt) content += `${txt}\n`;
            if (u) content += `${u}`;

            setInitialContent(content.trim());
            setIsOpen(true);
        }
    }, [searchParams, window.location.hash]); // Listen to hash changes too

    const handleClose = () => {
        setIsOpen(false);
        // Clear query params to prevent reopening on reload
        setSearchParams({});
    };

    return (
        <QuickCapture
            forceOpen={isOpen}
            initialContent={initialContent}
            onClose={handleClose}
        />
    );
};
