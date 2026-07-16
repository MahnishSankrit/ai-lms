import { getApiDocs } from "@/lib/swagger";
import SwaggerUIClient from "./SwaggerUIClient";

export default function ApiDocsPage() {
    const spec = getApiDocs();

    return <SwaggerUIClient spec={spec} />;
}