import React, { useRef, useEffect } from 'react';
import { SandpackPreview, useSandpack } from '@codesandbox/sandpack-react';
import { useSandpackContext } from '@/components/context/SandpackContext';

function SandpackPreviewClient() {
    const previewRef = useRef<any>(null); // avoid TSX ref error
    const { sandpack } = useSandpack();
    const { setSandpackResult } = useSandpackContext();

    const getSandpackClient = async () => {
        const client = previewRef.current?.getClient?.(); // safe optional chaining
        if (client) {
            const result = await client.getCodeSandboxURL();
            setSandpackResult(result);
          }
    };

    useEffect(() => {
        getSandpackClient();
    }, [sandpack]);

    return (
        <div className="h-full">
            {/* @ts-ignore used only if TS complains about ref */}
            <SandpackPreview
                ref={previewRef}
                showNavigator
                showRefreshButton
                className="h-full"
            />
        </div>
    );
}

export default SandpackPreviewClient;
