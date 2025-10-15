import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function HomeScreen() {
  const webViewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android" && Platform.Version < 30) {
      requestStoragePermission();
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 500); // 150ms delay
    return () => clearTimeout(timeout);
  }, []);

  if (!ready) return null; // skip first render

  //  Request storage permission (Android 9 and below)
  const requestStoragePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "Storage Permission Required",
          message: "This app needs access to your storage to download files.",
          buttonPositive: "OK",
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Storage permission granted!");
      } else {
        Alert.alert(
          "Permission Denied",
          "Cannot download files without permission."
        );
      }
    } catch (err) {
      console.warn(err);
      Alert.alert("Error requesting permission");
    }
  };

  //  Intercept links inside WebView
  const handleShouldStartLoad = (event: any) => {
    const { url } = event;

    // Handle tel/mailto links
    if (url.startsWith("tel:") || url.startsWith("mailto:")) {
      Linking.openURL(url).catch((err) =>
        Alert.alert("Error", "Failed to open URL: " + err.message)
      );
      return false;
    }

    // Detect PDFs
    if (url.toLowerCase().endsWith(".pdf")) {
      downloadPDF(url);
      return false;
    }

    return true;
  };

  const downloadPDF = async (url: string) => {
    try {
      const filename = url.split("/").pop() || "download.pdf";
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      Alert.alert("Download complete!");
      console.log("Downloaded file:", uri);

      // Check if sharing is supported (emulators often return false)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Download Complete", `File saved: ${uri}`);
      }
    } catch (error: any) {
      console.error("Download failed", error);
      Alert.alert("Download Failed", error.message || "Unknown error");
    }
  };

  const handleMessage = async (event: any) => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);

      if (messageData.type === "PDF_DATA") {
        const base64Data = messageData.data.replace(
          "data:application/pdf;base64,",
          ""
        );
        const fileUri = FileSystem.documentDirectory + "PaymentReceipt.pdf";

        // Write PDF to local storage
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Share if available
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Share Transaction Receipt",
          });
        } else {
          // Fallback alert
          Alert.alert("PDF Saved", `File path: ${fileUri}`);
        }
      }
    } catch (error: any) {
      console.error("Error handling WebView message:", error);
      Alert.alert("Failed to process PDF. Please try again.");
    }
  };

  const webViewContent = (
    <WebView
      ref={webViewRef}
      source={{ uri: "https://amlhlep.com/Sendmoneyhub/" }}
      style={styles.webView}
      automaticallyAdjustContentInsets={false}
      contentMode="mobile"
      overScrollMode="never"
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      mixedContentMode="always"
      startInLoadingState
      allowsInlineMediaPlayback
      androidLayerType="hardware"
      setSupportMultipleWindows={false}
      mediaPlaybackRequiresUserAction={false}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      injectedJavaScript={`window.open = (url) => { window.location = url; }; true;`}
      onMessage={handleMessage}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        Alert.alert("Error", `Failed to load: ${nativeEvent.description}`);
      }}
    />
  );
  const isIOS = Platform.OS === "ios";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        hidden={false}
        translucent={false}
        backgroundColor="#ffffff"
      />

      {Platform.OS === "android" ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={isIOS ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={{ flex: 1 }} onLayout={() => setLayoutReady(true)}>
              {layoutReady && webViewContent}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>{webViewContent}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e7e7e7",
  },
  webView: {
    // flex: 1,
  },
});
