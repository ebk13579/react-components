import React, { useRef, useState, useEffect, forwardRef, Ref } from 'react';
import { c } from 'ttag';
import { noop } from 'proton-shared/lib/helpers/function';

import { useHandler, useNotifications } from '../../hooks';
import { SquireType, getSquireRef, setSquireRef, initSquire } from './squireConfig';
import { pasteFileHandler } from './squireActions';
import { SquireEditorMetadata } from './interface';
import { LinkButton } from '../button';

const isHTMLEmpty = (html: string) => !html || html === '<div><br /></div>' || html === '<div><br></div>';

interface Props {
    placeholder?: string;
    metadata: SquireEditorMetadata;
    onReady: () => void;
    onFocus: () => void;
    onInput: (value: string) => void;
    onAddImages: (files: File[]) => void;
    onEllipseClick: () => void;
}

/**
 * This component is *Uncontrolled*
 * https://reactjs.org/docs/uncontrolled-components.html
 * There is issues when trying to synchronize input value to the current content of the editor
 * Uncontrolled components is prefered in this case
 */
const SquireIframe = (
    { placeholder, metadata, onReady, onFocus, onInput, onAddImages, onEllipseClick, ...rest }: Props,
    ref: Ref<SquireType>
) => {
    const { createNotification } = useNotifications();

    const [iframeReady, setIframeReady] = useState(false);
    const [squireReady, setSquireReady] = useState(false);
    const [isEmpty, setIsEmpty] = useState(false);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const handleLoad = () => setIframeReady(true);

        const iframeDoc = iframeRef.current?.contentDocument && iframeRef.current?.contentWindow?.document;

        if (iframeDoc?.readyState === 'complete') {
            handleLoad();
        }

        iframeRef.current?.addEventListener('load', handleLoad);
        return () => iframeRef.current?.removeEventListener('load', handleLoad);
    }, []);

    useEffect(() => {
        const init = async (iframeDoc: Document) => {
            try {
                const squire = await initSquire(iframeDoc, onEllipseClick);
                setSquireRef(ref, squire);
                setSquireReady(true);
                onReady();
            } catch (error) {
                createNotification({
                    type: 'error',
                    text: (
                        <>
                            {`${c('Error').t`The composer failed to load.`} `}
                            <LinkButton
                                className="alignbaseline nodecoration bold pm-button--currentColor"
                                onClick={() => {
                                    window.location.reload();
                                }}
                            >
                                {c('Error').t`Please refresh the page.`}
                            </LinkButton>
                        </>
                    ),
                    expiration: 20000,
                });
            }
        };

        if (iframeReady && !squireReady) {
            const iframeDoc = iframeRef.current?.contentWindow?.document as Document;
            void init(iframeDoc);
        }
    }, [iframeReady]);

    const handleFocus = useHandler(() => {
        onFocus();
        // A bit artificial but will trigger "autoCloseOutside" from all dropdowns
        document.dispatchEvent(new CustomEvent('dropdownclose'));
    });
    const handleInput = useHandler(() => {
        const content = getSquireRef(ref).getHTML();
        setIsEmpty(isHTMLEmpty(content));
        onInput(content);
    });
    const handlePasteEnhanced = useHandler(pasteFileHandler(onAddImages));
    const handlePaste = metadata.supportImages ? handlePasteEnhanced : noop;

    // Pass dragenter and dragleave events to parent document
    const handlePassDragEvents = useHandler((event: DragEvent) => {
        const newEvent = new CustomEvent(event.type, { bubbles: true }) as any;
        newEvent.dataTransfer = event.dataTransfer;
        iframeRef.current?.dispatchEvent(newEvent);
    });

    useEffect(() => {
        if (squireReady) {
            const squire = getSquireRef(ref);

            squire.addEventListener('focus', handleFocus);
            squire.addEventListener('input', handleInput);
            squire.addEventListener('paste', handlePaste);
            squire.addEventListener('dragenter', handlePassDragEvents);
            squire.addEventListener('dragleave', handlePassDragEvents);
            return () => {
                squire.removeEventListener('focus', handleFocus);
                squire.removeEventListener('input', handleInput);
                squire.removeEventListener('paste', handlePaste);
                squire.removeEventListener('dragenter', handlePassDragEvents);
                squire.removeEventListener('dragleave', handlePassDragEvents);
            };
        }
    }, [squireReady]);

    return (
        <div className="editor-squire-wrapper fill w100 scroll-if-needed flex-item-fluid relative">
            {placeholder && isEmpty && <div className="absolute ml1 no-pointer-events placeholder">{placeholder}</div>}
            <iframe title="Editor" ref={iframeRef} frameBorder="0" className="w100 h100 squireIframe" {...rest} />
        </div>
    );
};

export default forwardRef(SquireIframe);
