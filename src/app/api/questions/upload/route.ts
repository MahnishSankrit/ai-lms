import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// validation not needed in this route; file import only


export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        // check if the request has a file
        const formData = await req.formData();
        const fileEntry = formData.get("file");
        if (!fileEntry || !(fileEntry instanceof File)) {
            return NextResponse.json(
                { error: "No file uploaded or invalid file field" },
                { status: 400 }
            )
        }
        const file = fileEntry as File;

        // validate the file type, it should be a pdf, ppt , docx file
        // const allowedTypes = [
        //     "application/pdf",
        //     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        //     "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        // ];

        // if(!allowedTypes.includes(file.type)){
        //     return NextResponse.json(
        //         { error: "Invalid file type. Only PDF, PPT, and DOCX files are allowed." },
        //         { status: 400 }
        //     )
        // }

        // allowed mime types (adjust as needed)
        const allowedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only PDF, DOCX, and PPTX files are allowed." },
                { status: 400 }
            )
        }

        // validate the file size, it should be less than 10MB
        const maxSize = 10 * 1024 * 1024
        if(file.size > maxSize){
            return NextResponse.json(
                { error: "File size exceeds the maximum limit of 10MB." },
                { status: 400 }
            )
        }

        const teacherId = session.user.id;

        const teacher = await prisma.user.findUnique({
            where: {
                id: teacherId,
            }
        })

        if(!teacher){
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        // upload the file to the server and get the file url , upload on the cloudinary and get the url
        const uploadFileToServer = async (file: File): Promise<string> => {
            const fd = new FormData();
            fd.append("file", file);
            const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "";
            if (uploadPreset) fd.append("upload_preset", uploadPreset);

            const cloudinaryUrl = process.env.CLOUDINARY_URL ?? "https://api.cloudinary.com/v1_1/dlywipzyo/upload";

            const res = await fetch(cloudinaryUrl, {
                method: "POST",
                body: fd,
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Upload failed: ${res.status} ${text}`);
            }

            const data = await res.json();
            return data.secure_url as string;
        };

        let fileUrl: string;
        try {
            fileUrl = await uploadFileToServer(file);
        } catch (uploadErr) {
            console.error("File upload error:", uploadErr);
            return NextResponse.json({ error: "File upload failed" }, { status: 502 });
        }

        const upload = await prisma.upload.create({
            data: {
                uploadedById: teacher.id,
                fileUrl: fileUrl,
                fileName: file.name,
                // fileType: file.type,
                mimeType: file.type,
                size: file.size,
            }
        })

        return NextResponse.json(
            { message: "File uploaded successfully", upload },
            { status: 201 }
        )




    } catch (error) {
        console.error("Error in import route:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}

