FROM public.ecr.aws/lambda/nodejs:18

# Install Chrome dependencies
RUN yum install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils

# Copy all necessary files
COPY package*.json tsconfig.json ./
COPY *.ts ./

# Install dependencies
RUN npm install

# Build TypeScript code
RUN npm install -g esbuild && \
    esbuild index.ts \
    --bundle \
    --minify \
    --platform=node \
    --target=node18 \
    --format=esm \
    --external:@aws-sdk/* \
    --external:@sparticuz/chromium \
    --external:puppeteer-core \
    --outfile=index.mjs

# Clean up dev dependencies
RUN npm prune --production

# Set the CMD to your handler
CMD [ "index.handler" ]