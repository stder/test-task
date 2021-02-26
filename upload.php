<?php
class Actions
{
    public function status()
    {
        $params = [
            'size' => 0
        ];
        $tmpName = $_SERVER['HTTP_X_FILE_ID'];
        $tmpPath = '/tmp/test/' . $tmpName;
        if (file_exists($tmpPath)) {
            $size = filesize($tmpPath);
            $params['size'] = $size;
        }
        echo json_encode($params);
    }

    public function upload()
    {
        $tmpName = $_SERVER['HTTP_X_FILE_ID'];
        $tmpPath = '/tmp/test/' . $tmpName;
        $fileSize = $_SERVER['HTTP_X_FILE_SIZE'];
        $uploadedFileName = $_SERVER["DOCUMENT_ROOT"] . '/uploads/' . $_SERVER['HTTP_X_FILE_NAME'];
        $inputHandler = fopen('php://input', "r");
        if ($fileSize == filesize($tmpPath)) {
            unlink($tmpPath);
        }
        $fileHandler = fopen($tmpPath, "a");

        // save data from the input stream
        while($buffer = fgets($inputHandler, 4096)) {
            fwrite($fileHandler, $buffer);
        }

        fclose($fileHandler);

        clearstatcache();

        if ($fileSize == filesize($tmpPath)) {
            rename($tmpPath, $uploadedFileName);
        }
    }

    public function index()
    {
        include('index.html');
    }

    public function notFound()
    {
        header("HTTP/1.0 404 Not Found");
    }

    public function run(): void
    {
        $action = $_GET['action'] ?? null;
        if ($action) {
            if (method_exists($this, $action)) {
                $this->$action();
            } else {
                $this->notFound();
            }
        } else {
            $this->index();
        }
    }
}

$action = new Actions();
$action->run();
