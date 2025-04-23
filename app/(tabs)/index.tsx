import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Alert, Platform, Button, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useToast } from 'react-native-toast-notifications';
import { PermissionsAndroid } from 'react-native';

export default function HomeScreen() {
  const webViewRef = useRef<WebView | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version < 30) {
      requestStoragePermission();
    }
  }, []);

  // Request storage permission for Android 9 and below
  const requestStoragePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to your storage to download files.',
          buttonPositive: 'OK',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        toast.show('Storage permission granted!', { type: 'success' });
      } else {
        Alert.alert('Permission Denied', 'Cannot download files without permission.');
      }
    } catch (err) {
      console.warn(err);
      toast.show('Error requesting permission', { type: 'danger' });
    }
  };

  // Detect and download PDFs when clicked inside the WebView
  const handleShouldStartLoad = (event: any) => {
    const { url } = event;

    // If a PDF link is clicked, intercept and handle it
    if (url.endsWith('.pdf')) {
      console.log('Detected PDF URL:', url);
      downloadPDF(url);
      return false; // Prevent WebView from opening the PDF
    }

    return true; // Allow other URLs to load normally
  };

  // Download and save PDF
  const downloadPDF = async (url: string) => {
    try {
      const filename = url.split('/').pop() || 'download.pdf';
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
  
      console.log('Downloading to:', fileUri);
      console.log('PDF URL:', url);
  
      // Make sure the file URL is correct
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      console.log('Downloaded file to:', uri);
  
      toast.show(`Download Complete: ${uri}`, { type: 'success' });
  
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Download Complete', `File saved: ${uri}`);
      }
    } catch (error) {
      console.error('Download failed', error);
      Alert.alert('Download Failed', error.message || 'Unknown error');
    }
  };
  

  // Handle messages from WebView
  const handleMessage = async (event) => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);

      if (messageData.type === "PDF_DATA") {
        const base64Data = messageData.data.replace("data:application/pdf;base64,", "");
        const fileUri = FileSystem.documentDirectory + "receipt.pdf";

        // Write the file
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert("Success", "PDF saved successfully!");

        // Open or share the file
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri);
        }
      }
    } catch (error) {
      console.error("Error handling WebView message:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://liveexshield.ca/Sendmoneyhub' }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        originWhitelist={['*']}
        scalesPageToFit
        startInLoadingState
        allowsInlineMediaPlayback
        allowFileAccessFromFileURLs={true}
        mediaPlaybackRequiresUserAction={false}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={handleMessage}  // Add the onMessage prop to handle messages
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          Alert.alert('Error', `Failed to load: ${nativeEvent.description}`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e7e7e7',
  },
  webView: {
    flex: 1,
  },
  buttonContainer: {
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
});
